import { effect, inject, Injectable, signal, untracked } from '@angular/core';
import { CurrentUserService } from '../../core/auth/current-user.service';
import { canDelete } from '../../core/auth/permissions';
import { DemoSeeder } from '../../../demo/demo-seeder';
import { LogbookRepository } from '../../core/data-access/logbook.repository';
import type { Logbook, LogbookSettingsPatch, NewLogbook } from '../../core/models/logbook.models';

export type LoadStatus = 'loading' | 'ready' | 'error';

/** Logbooks visible to the current user. Reloads when the user changes. */
@Injectable({ providedIn: 'root' })
export class LogbooksStore {
  private readonly repository = inject(LogbookRepository);
  private readonly currentUser = inject(CurrentUserService);
  private readonly demoSeeder = inject(DemoSeeder, { optional: true });

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
      const user = this.currentUser.user();
      await this.demoSeeder?.ensureFor(user).catch(() => undefined); // demo content is optional
      this._logbooks.set(await this.repository.listLogbooks(user));
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

  /** Permanently deletes a logbook the current user owns (or any logbook, for an administrator). Demo logbooks are protected. */
  async delete(id: string): Promise<void> {
    const logbook = this._logbooks().find((l) => l.id === id);
    if (!logbook || !canDelete(logbook, this.currentUser.user(), this.currentUser.isAdmin())) {
      throw new Error('You are not allowed to delete this logbook.');
    }
    if (logbook.demo) {
      throw new Error('Demo logbooks cannot be deleted.');
    }
    await this.repository.deleteLogbook(id);
    this._logbooks.update((all) => all.filter((l) => l.id !== id));
  }
}
