import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { EntryConflictError, LogbookRepository } from '../../core/data-access/logbook.repository';
import type { Entry, EntryChanges } from '../../core/models/logbook.models';
import { EntriesStore } from '../logbook/entries.store';

export type SaveStatus = 'saved' | 'dirty' | 'saving' | 'error' | 'conflict';

export const AUTOSAVE_DEBOUNCE_MS = 1000;
export const AUTOSAVE_RETRY_MS = 5000;

/**
 * Owns the entry being edited and keeps it saved.
 *
 * Edits are merged and written after a short pause, saves are serialised, failures are retried,
 * and anything pending is flushed when the entry changes, the page hides, or the page is left.
 * Each save names the revision it builds on; if someone else saved in between, the status becomes
 * `conflict` and nothing is overwritten (reload the entry to see their changes).
 * `entry()` mirrors the latest edits, so it is always safe to rebuild the editor from it.
 */
@Injectable()
export class EntryAutosave {
  private readonly repository = inject(LogbookRepository);
  private readonly entries = inject(EntriesStore);

  private readonly _entry = signal<Entry | undefined>(undefined);
  private readonly _status = signal<SaveStatus>('saved');
  private readonly _loadFailed = signal(false);
  private readonly _generation = signal(0);
  private readonly _savedCount = signal(0);

  readonly entry = this._entry.asReadonly();
  readonly status = this._status.asReadonly();
  readonly loadFailed = this._loadFailed.asReadonly();
  /** Increments on every successful save; lets dependants (version list) refresh. */
  readonly savedCount = this._savedCount.asReadonly();
  /** Identity of the document in the editor; changes on open and after a restore. */
  readonly docKey = computed(() => {
    const entry = this._entry();
    return entry ? `${entry.id}:${this._generation()}` : null;
  });

  private pending: EntryChanges = {};
  /** The revision on the server that the edits build on; moves forward with every save. */
  private revision = 0;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private queue: Promise<void> = Promise.resolve();
  private destroyed = false;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      void this.flush();
    });
  }

  async open(entryId: string): Promise<void> {
    await this.flush();
    this._entry.set(undefined);
    this._loadFailed.set(false);
    try {
      const entry = await this.repository.getEntry(entryId);
      this._loadFailed.set(!entry);
      this._entry.set(entry);
      this._generation.update((n) => n + 1); // opening it again rebuilds the editor from what was loaded
      this.revision = entry?.revision ?? 0;
      this._status.set('saved');
    } catch {
      this._loadFailed.set(true);
    }
  }

  /** Throws away unsaved edits and shows the entry as it is on the server now (after a conflict). */
  async reload(): Promise<void> {
    const entry = this._entry();
    if (entry) {
      await this.discard();
      await this.open(entry.id);
    }
  }

  edit(changes: EntryChanges): void {
    if (!this._entry()) {
      return;
    }
    this.pending = { ...this.pending, ...changes };
    this._entry.update((entry) => entry && { ...entry, ...changes });
    this._status.set('dirty');
    this.schedule(AUTOSAVE_DEBOUNCE_MS);
  }

  /** Writes anything pending now and resolves when the write has finished. */
  flush(): Promise<void> {
    clearTimeout(this.timer);
    const entry = this._entry();
    if (entry && Object.keys(this.pending).length > 0) {
      const changes = this.pending;
      this.pending = {};
      this._status.set('saving');
      this.queue = this.queue.then(() => this.persist(entry.id, changes));
    }
    return this.queue;
  }

  /** Throws away unsaved edits (used when the entry is about to be deleted) and waits for any write in flight. */
  discard(): Promise<void> {
    clearTimeout(this.timer);
    this.pending = {};
    this._status.set('saved');
    return this.queue;
  }

  async saveVersion(): Promise<void> {
    const entry = this._entry();
    if (entry) {
      await this.flush();
      await this.repository.createVersion(entry.id);
      this._savedCount.update((n) => n + 1);
    }
  }

  async restore(versionId: string): Promise<void> {
    const entry = this._entry();
    if (!entry) {
      return;
    }
    await this.flush();
    const restored = await this.repository.restoreVersion(entry.id, versionId);
    this.entries.replace(restored);
    this._entry.set(restored);
    this.revision = restored.revision;
    this._generation.update((n) => n + 1);
    this._savedCount.update((n) => n + 1);
    this._status.set('saved');
  }

  private schedule(delayMs: number): void {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.flush(), delayMs);
  }

  private async persist(entryId: string, changes: EntryChanges): Promise<void> {
    try {
      const saved = await this.repository.saveEntry(entryId, changes, this.revision);
      this.revision = saved.revision;
      this.entries.replace(saved);
      this._savedCount.update((n) => n + 1);
      this._status.set(Object.keys(this.pending).length > 0 ? 'dirty' : 'saved');
    } catch (error) {
      // Keep the edits (newer ones win).
      this.pending = { ...changes, ...this.pending };
      if (error instanceof EntryConflictError) {
        // Trying again would only be refused again, and giving up would lose nothing: the edits stay here.
        this._status.set('conflict');
        return;
      }
      this._status.set('error');
      if (!this.destroyed) {
        this.schedule(AUTOSAVE_RETRY_MS);
      }
    }
  }
}
