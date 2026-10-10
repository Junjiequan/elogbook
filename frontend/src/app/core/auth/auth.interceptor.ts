import { HttpErrorResponse, type HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AppConfig } from '../api/app-config';
import { ApiAuthService } from './api-auth.service';

/**
 * Sends the signed-in person's token with every call to the API, and when the API says the token is no
 * longer good (expired, or the account is gone) signs out and goes to the sign-in page, which brings the
 * person back to where they were.
 */
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(ApiAuthService);
  const router = inject(Router);
  const toApi = request.url.startsWith(inject(AppConfig).apiUrl);
  const token = toApi ? auth.token() : null;

  const sent = token
    ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : request;
  return next(sent).pipe(
    catchError((error: unknown) => {
      if (token && error instanceof HttpErrorResponse && error.status === 401) {
        const returnUrl = router.url;
        auth.expire();
        void router.navigate(['/login'], { queryParams: { returnUrl } });
      }
      return throwError(() => error);
    }),
  );
};
