import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButton } from '@angular/material/button';
import { MatButtonToggle, MatButtonToggleGroup } from '@angular/material/button-toggle';
import { MatError, MatFormField, MatHint, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';

import { ApiAuthService, AuthError } from '../../../core/auth/api-auth.service';
import { UserControls } from '../../../shared/user-controls/user-controls';

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

  private readonly auth = inject(ApiAuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder).nonNullable;
  protected readonly error = signal<string | null>(null);
  protected readonly busy = signal(false);
  protected readonly mode = signal<'signin' | 'signup'>('signin');

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
