import type { Signal } from '@angular/core';
import type { User } from '../models/logbook.models';

/**
 * Who is signed in. The app only depends on this contract; the implementation is swappable
 * (today `TestAuthService`, later an OIDC client against the facility identity provider).
 */
export abstract class AuthService {
  abstract readonly user: Signal<User | null>;
  abstract signOut(): void;
}
