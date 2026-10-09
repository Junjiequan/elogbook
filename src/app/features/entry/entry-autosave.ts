import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { CurrentUserService } from '../../core/auth/current-user.service';
import { LogbookRepository } from '../../core/data-access/logbook.repository';
import type { Entry, EntryChanges, User } from '../../core/models/logbook.models';
import { EntriesStore } from '../logbook/entries.store';

export type SaveStatus = 'saved' | 'dirty' | 'saving' | 'error';

export const AUTOSAVE_DEBOUNCE_MS = 1000;
export const AUTOSAVE_RETRY_MS = 5000;

/**
 * Owns the entry being edited and keeps it saved.
 *
 * Edits are merged and written after a short pause, saves are serialised, failures are retried,
 * and anything pending is flushed when the entry changes, the page hides, or the page is left.
 * `entry()` mirrors the latest edits, so it is always safe to rebuild the editor from it.
 */
@Injectable()
export class EntryAutosave {
  private readonly repository = inject(LogbookRepository);
  private readonly currentUser = inject(CurrentUserService);
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
  /** Who made the pending edits; captured at edit time so signing out cannot change the author. */
  private author: User = this.currentUser.user();
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
      this._status.set('saved');
    } catch {
      this._loadFailed.set(true);
    }
  }

  edit(changes: EntryChanges): void {
    if (!this._entry()) {
      return;
    }
    this.author = this.currentUser.user();
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
      const author = this.author;
      this.queue = this.queue.then(() => this.persist(entry.id, changes, author));
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
      await this.repository.createVersion(entry.id, this.currentUser.user(), 'manual');
      this._savedCount.update((n) => n + 1);
    }
  }

  async restore(versionId: string): Promise<void> {
    const entry = this._entry();
    if (!entry) {
      return;
    }
    await this.flush();
    const restored = await this.repository.restoreVersion(
      entry.id,
      versionId,
      this.currentUser.user(),
    );
    this.entries.replace(restored);
    this._entry.set(restored);
    this._generation.update((n) => n + 1);
    this._savedCount.update((n) => n + 1);
    this._status.set('saved');
  }

  private schedule(delayMs: number): void {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.flush(), delayMs);
  }

  private async persist(entryId: string, changes: EntryChanges, author: User): Promise<void> {
    try {
      const saved = await this.repository.saveEntry(entryId, changes, author);
      this.entries.replace(saved);
      this._savedCount.update((n) => n + 1);
      this._status.set(Object.keys(this.pending).length > 0 ? 'dirty' : 'saved');
    } catch {
      // Keep the edits (newer ones win) and try again.
      this.pending = { ...changes, ...this.pending };
      this._status.set('error');
      if (!this.destroyed) {
        this.schedule(AUTOSAVE_RETRY_MS);
      }
    }
  }
}
