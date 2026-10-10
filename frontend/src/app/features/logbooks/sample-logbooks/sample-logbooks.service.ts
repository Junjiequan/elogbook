import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { effect, inject, Injectable, signal, untracked } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AppConfig } from '../../../core/api/app-config';
import { CurrentUserService } from '../../../core/auth/current-user.service';
import { LogbooksStore } from '../logbooks.store';

/**
 * Sample logbooks for trying the app: `POST /demo` makes a set for the signed-in person, `DELETE /demo`
 * removes exactly those again. The server can switch the whole thing off, in which case nothing here shows.
 */
@Injectable({ providedIn: 'root' })
export class SampleLogbooks {
  private readonly http = inject(HttpClient);
  private readonly config = inject(AppConfig);
  private readonly currentUser = inject(CurrentUserService);
  private readonly store = inject(LogbooksStore);

  private readonly _available = signal(false);
  private readonly _count = signal(0);
  private readonly _busy = signal(false);

  /** The server offers sample logbooks. */
  readonly available = this._available.asReadonly();
  /** How many sample logbooks the person has right now. */
  readonly count = this._count.asReadonly();
  readonly busy = this._busy.asReadonly();

  constructor() {
    effect(() => {
      const signedIn = this.currentUser.isSignedIn();
      this.currentUser.user();
      untracked(() => {
        if (signedIn) {
          void this.refresh();
        } else {
          this._available.set(false);
          this._count.set(0);
        }
      });
    });
  }

  async refresh(): Promise<void> {
    try {
      const status = await firstValueFrom(this.http.get<{ logbooks: number }>(this.url()));
      this._available.set(true);
      this._count.set(status.logbooks);
    } catch (error) {
      // 404: switched off on the server. Anything else: not worth offering right now.
      this._available.set(false);
      if (!(error instanceof HttpErrorResponse)) {
        throw error;
      }
    }
  }

  add(): Promise<void> {
    return this.change(() => this.http.post<unknown>(this.url(), {}));
  }

  remove(): Promise<void> {
    return this.change(() => this.http.delete<unknown>(this.url()));
  }

  private async change(request: () => ReturnType<HttpClient['get']>): Promise<void> {
    this._busy.set(true);
    try {
      await firstValueFrom(request());
      await this.store.load();
      await this.refresh();
    } finally {
      this._busy.set(false);
    }
  }

  private url(): string {
    return `${this.config.apiUrl}/demo`;
  }
}
