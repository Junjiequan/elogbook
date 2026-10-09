import { inject } from '@angular/core';
import { type CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/** Sends signed-out visitors to `/login`, remembering where they wanted to go. */
export const authGuard: CanActivateFn = (_route, state) => {
  const router = inject(Router);
  return inject(AuthService).user()
    ? true
    : router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};
