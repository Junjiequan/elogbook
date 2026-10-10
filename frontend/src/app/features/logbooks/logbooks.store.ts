import { effect, inject, Injectable, signal, untracked } from '@angular/core';
import { CurrentUserService } from '../../core/auth/current-user.service';
import { LogbookRepository } from '../../core/data-access/logbook.repository';
import type { Logbook, LogbookSettingsPatch, NewLogbook } from '../../core/models/logbook.models';

export type LoadStatus = 'loading' | 'ready' | 'error';

/** Logbooks visible to the current user. Reloads when the user changes. */
@Injectable({ providedIn: 'root' })
export class LogbooksStore {
  private readonly repository = inject(LogbookRepository);
  private readonly currentUser = inject(CurrentUserService);

  private readonly _logbooks = signal<Logbook[]>([]);
  private readonly _status = signal<LoadStatus>('loading');

  readonly logbooks = this._logbooks.asReadonly();
  readonly status = this._status.asReadonly();

  constructor() {
    effect(() => {
      const signedIn = this.currentUser.isSignedIn();
      this.currentUser.user();
      untracked(() => {
        if (signedIn) {
          void this.load();
        } else {
          this._logbooks.set([]);
          this._status.set('loading');
        }
      });
    });
  }

  async load(): Promise<void> {
    this._status.set('loading');
    try {
      this._logbooks.set(await this.repository.listLogbooks());
      this._status.set('ready');
    } catch {
      this._status.set('error');
    }
  }

  async create(input: NewLogbook): Promise<Logbook> {
    const logbook = await this.repository.createLogbook(input);
    this._logbooks.update((all) => [logbook, ...all]);
    return logbook;
  }

  async updateSettings(id: string, patch: LogbookSettingsPatch): Promise<void> {
    const updated = await this.repository.updateLogbook(id, patch);
    this._logbooks.update((all) => all.map((l) => (l.id === id ? updated : l)));
  }

  /**
   * Permanently deletes a logbook the server says the current user may delete (an owner, or an
   * administrator). Sample logbooks are protected: they go all at once with "Remove sample logbooks".
   */
  async delete(id: string): Promise<void> {
    const logbook = this._logbooks().find((l) => l.id === id);
    if (!logbook?.canDelete) {
      throw new Error('You are not allowed to delete this logbook.');
    }
    if (logbook.demo) {
      throw new Error('Sample logbooks cannot be deleted one by one.');
    }
    await this.repository.deleteLogbook(id);
    this._logbooks.update((all) => all.filter((l) => l.id !== id));
  }
}
