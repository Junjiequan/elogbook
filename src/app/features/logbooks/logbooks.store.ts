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
      this.currentUser.user();
      untracked(() => void this.load());
    });
  }

  async load(): Promise<void> {
    this._status.set('loading');
    try {
      this._logbooks.set(await this.repository.listLogbooks(this.currentUser.user()));
      this._status.set('ready');
    } catch {
      this._status.set('error');
    }
  }

  async create(input: NewLogbook): Promise<Logbook> {
    const logbook = await this.repository.createLogbook(input, this.currentUser.user());
    this._logbooks.update((all) => [logbook, ...all]);
    return logbook;
  }

  async updateSettings(id: string, patch: LogbookSettingsPatch): Promise<void> {
    const updated = await this.repository.updateLogbook(id, patch);
    this._logbooks.update((all) => all.map((l) => (l.id === id ? updated : l)));
  }
}
