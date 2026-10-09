import type { Signal } from '@angular/core';
import type { User } from '../models/logbook.models';

/**
 * Who is signed in. The app only depends on this contract; the implementation is swappable
 * (today `TestAuthService`, later an OIDC client against the facility identity provider).
 */
export abstract class AuthService {
  abstract readonly user: Signal<User | null>;
  /** Facility administrators may delete any logbook they can open. */
  abstract readonly isAdmin: Signal<boolean>;
  abstract signOut(): void;
}
