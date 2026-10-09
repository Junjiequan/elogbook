import { signal, type Provider } from '@angular/core';
import { AuthService } from '../core/auth/auth.service';
import { DEMO_USERS } from '../core/data-access/demo-data';
import type { User } from '../core/models/logbook.models';

/** Signs the given user in for a test, without any real authentication. */
export function provideFakeAuth(user: User = DEMO_USERS[0]): Provider {
  return {
    provide: AuthService,
    useValue: { user: signal<User | null>(user).asReadonly(), signOut: () => undefined },
  };
}
