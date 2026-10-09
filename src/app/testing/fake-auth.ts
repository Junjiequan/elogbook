import { signal, type Provider } from '@angular/core';
import { AuthService } from '../core/auth/auth.service';
import { DEMO_USERS } from '../core/data-access/demo/demo-users';
import type { User } from '../core/models/logbook.models';

/** Signs the given user in for a test, without any real authentication. */
export function provideFakeAuth(
  user: User = DEMO_USERS[0],
  options: { admin?: boolean } = {},
): Provider {
  return {
    provide: AuthService,
    useValue: {
      user: signal<User | null>(user).asReadonly(),
      isAdmin: signal(options.admin ?? false).asReadonly(),
      signOut: () => undefined,
    },
  };
}
