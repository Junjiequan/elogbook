import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButton } from '@angular/material/button';
import { MatButtonToggle, MatButtonToggleGroup } from '@angular/material/button-toggle';
import { MatError, MatFormField, MatHint, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';

import { ApiAuthService, AuthError } from '../../../core/auth/api-auth.service';
import { Redirector } from '../../../core/auth/redirector';
import { UserControls } from '../../../shared/user-controls/user-controls';

/** Messages for the `oauthError` codes. */
const OAUTH_MESSAGES: Record<string, string> = {
  denied: 'Sign-in was cancelled.',
  expired: 'That sign-in took too long. Try again.',
  unverified: 'Your email address is not verified with the provider, so it cannot be used here.',
  conflict: 'This email address is already linked to a different account at the provider.',
  not_allowed: 'Accounts with this email address are not allowed to sign in here.',
  no_account: 'There is no account for this email address yet. Ask for access first.',
  unavailable: 'The sign-in service cannot be reached right now. Try again in a moment.',
};

@Component({
  selector: 'app-login-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatButton,
    MatButtonToggle,
    MatButtonToggleGroup,
    MatError,
    MatFormField,
    MatHint,
    MatInput,
    MatLabel,
    ReactiveFormsModule,
    UserControls,
  ],
  templateUrl: './login-page.html',
  styleUrl: './login-page.scss',
})
export class LoginPage {
  /** Where to go after signing in (from the `returnUrl` query parameter). */
  readonly returnUrl = input<string>();
  /** Why OAuth sign-in failed (`oauthError` query parameter). */
  readonly oauthError = input<string>();

  private readonly auth = inject(ApiAuthService);
  private readonly router = inject(Router);
  private readonly redirector = inject(Redirector);
  private readonly fb = inject(FormBuilder).nonNullable;
  protected readonly error = signal<string | null>(null);
  protected readonly busy = signal(false);
  protected readonly mode = signal<'signin' | 'signup'>('signin');
  /** Button text; `null` when off. */
  protected readonly oauthLabel = signal<string | null>(null);

  protected readonly signInForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  protected readonly signUpForm = this.fb.group({
    name: ['', [Validators.required, Validators.pattern(/\S/)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  constructor() {
    void this.auth.oauthLabel().then((label) => this.oauthLabel.set(label));
    // Show why OAuth failed.
    effect(() => {
      const code = this.oauthError();
      if (code) {
        this.error.set(OAUTH_MESSAGES[code] ?? 'Signing in did not work. Try again.');
      }
    });
    // Signed in (just now, or already) → continue to where the visitor was heading.
    effect(() => {
      if (this.auth.user()) {
        void this.router.navigateByUrl(this.safeReturnUrl());
      }
    });
  }

  protected setMode(mode: 'signin' | 'signup'): void {
    this.mode.set(mode);
    this.error.set(null);
  }

  protected signInWithProvider(): void {
    this.redirector.to(this.auth.oauthLoginUrl(this.safeReturnUrl()));
  }

  protected signIn(): Promise<void> {
    const { email, password } = this.signInForm.getRawValue();
    return this.run(() => this.auth.signIn(email, password));
  }

  protected signUp(): Promise<void> {
    const { name, email, password } = this.signUpForm.getRawValue();
    return this.run(() => this.auth.signUp(name, email, password));
  }

  private async run(action: () => Promise<void>): Promise<void> {
    this.error.set(null);
    this.busy.set(true);
    try {
      await action();
    } catch (error) {
      this.error.set(error instanceof AuthError ? error.message : 'Something went wrong.');
    } finally {
      this.busy.set(false);
    }
  }

  /** Only in-app paths; anything else (e.g. `//evil.example`) falls back to the home page. */
  private safeReturnUrl(): string {
    const url = this.returnUrl();
    return url && url.startsWith('/') && !url.startsWith('//') && !url.startsWith('/login')
      ? url
      : '/logbooks';
  }
}
