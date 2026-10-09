import { computed, inject, Injectable } from '@angular/core';
import type { User } from '../models/logbook.models';
import { AuthService } from './auth.service';

/** Stand-in used only while signed out; routes that read the user are guarded, so it is never shown. */
export const ANONYMOUS_USER: User = { id: '', name: 'Signed out', email: '' };

@Injectable({ providedIn: 'root' })
export class CurrentUserService {
  private readonly auth = inject(AuthService);

  readonly isSignedIn = computed(() => this.auth.user() !== null);
  /** The signed-in user. Only meaningful behind `authGuard`. */
  readonly user = computed(() => this.auth.user() ?? ANONYMOUS_USER);
}
