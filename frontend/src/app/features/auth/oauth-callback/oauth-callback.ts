import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { ApiAuthService } from '../../../core/auth/api-auth.service';

/** Takes the token from the address fragment, signs in and replaces the address. */
@Component({
  selector: 'app-oauth-callback',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatProgressSpinner],
  template: `
    <div class="wrap" role="status">
      <mat-spinner diameter="32" />
      <p>Signing you in…</p>
    </div>
  `,
  styles: `
    .wrap {
      display: grid;
      place-items: center;
      gap: 12px;
      padding: 64px 16px;
      color: var(--mat-sys-on-surface-variant);
    }
  `,
})
export class OAuthCallback {
  private readonly auth = inject(ApiAuthService);
  private readonly router = inject(Router);
  private readonly fragment = inject(ActivatedRoute).snapshot.fragment;

  constructor() {
    void this.finish();
  }

  private async finish(): Promise<void> {
    const params = new URLSearchParams(this.fragment ?? '');
    const token = params.get('access_token');
    const expiresIn = Number(params.get('expires_in'));
    try {
      if (!token || !(expiresIn > 0)) {
        throw new Error('no token');
      }
      await this.auth.completeOAuth(token, expiresIn);
    } catch {
      await this.router.navigate(['/login'], {
        queryParams: { oauthError: 'failed' },
        replaceUrl: true,
      });
      return;
    }
    await this.router.navigateByUrl(safeReturnTo(params.get('return_to')), { replaceUrl: true });
  }
}

/** In-app paths only. */
export function safeReturnTo(value: string | null): string {
  return value && value.startsWith('/') && !value.startsWith('//') && !value.startsWith('/login')
    ? value
    : '/logbooks';
}
