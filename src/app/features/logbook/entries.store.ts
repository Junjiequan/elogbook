import { inject, Injectable, signal } from '@angular/core';
import { CurrentUserService } from '../../core/auth/current-user.service';
import { LogbookRepository } from '../../core/data-access/logbook.repository';
import type { Entry } from '../../core/models/logbook.models';
import type { LoadStatus } from '../logbooks/logbooks.store';

/** Entries of the logbook currently open. Provided by the logbook page, so it dies with it. */
@Injectable()
export class EntriesStore {
  private readonly repository = inject(LogbookRepository);
  private readonly currentUser = inject(CurrentUserService);

  private readonly _entries = signal<Entry[]>([]);
  private readonly _status = signal<LoadStatus>('loading');

  readonly entries = this._entries.asReadonly();
  readonly status = this._status.asReadonly();

  async load(logbookId: string): Promise<void> {
    this._status.set('loading');
    try {
      this._entries.set(await this.repository.listEntries(logbookId));
      this._status.set('ready');
    } catch {
      this._status.set('error');
    }
  }

  async create(logbookId: string): Promise<Entry> {
    const entry = await this.repository.createEntry(logbookId, this.currentUser.user());
    this._entries.update((all) => [entry, ...all]);
    return entry;
  }

  /** Reflect a saved entry (new title, timestamps) in the list without reloading it. */
  replace(entry: Entry): void {
    this._entries.update((all) => all.map((e) => (e.id === entry.id ? entry : e)));
  }
}
