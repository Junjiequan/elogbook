import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButton } from '@angular/material/button';
import { MatButtonToggle, MatButtonToggleGroup } from '@angular/material/button-toggle';
import { MatError, MatFormField, MatHint, MatLabel } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';

import { DEMO_USERS } from '../../../demo/demo-users';
import { renderGoogleButton } from '../google-identity';
import { AuthError, TestAuthService } from '../test-auth.service';
import { DEMO_PASSWORD, GOOGLE_CLIENT_ID } from '../test-auth.config';

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
    MatIcon,
    MatInput,
    MatLabel,
    ReactiveFormsModule,
  ],
  templateUrl: './login-page.html',
  styleUrl: './login-page.scss',
})
export class LoginPage {
  /** Where to go after signing in (from the `returnUrl` query parameter). */
  readonly returnUrl = input<string>();

  private readonly auth = inject(TestAuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly googleClientId = inject(GOOGLE_CLIENT_ID);
  private readonly googleHost = viewChild<ElementRef<HTMLElement>>('googleButton');

  protected readonly googleEnabled = !!this.googleClientId;
  protected readonly demoUsers = DEMO_USERS;
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

    afterNextRender(() => {
      const host = this.googleHost()?.nativeElement;
      if (host && this.googleEnabled) {
        renderGoogleButton(host, this.googleClientId, (credential) =>
          this.run(() => this.auth.signInWithGoogle(credential)),
        ).catch(() => this.error.set('Google sign-in is unavailable right now.'));
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

  protected useDemo(email: string): Promise<void> {
    return this.run(() => this.auth.signIn(email, DEMO_PASSWORD));
  }

  private async run(action: () => void | Promise<void>): Promise<void> {
    this.error.set(null);
    this.busy.set(true);
    try {
      await action();
    } catch (error) {
      this.error.set(
        error instanceof AuthError || error instanceof Error
          ? error.message
          : 'Something went wrong.',
      );
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
