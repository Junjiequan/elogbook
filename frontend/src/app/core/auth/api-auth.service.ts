import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AppConfig } from '../api/app-config';
import type { User } from '../models/logbook.models';
import { AuthService } from './auth.service';
import { OAUTH_MESSAGES } from './oauth-messages';
import type { OAuthProvider } from './oauth-widgets';

const SESSION_KEY = 'elogbook.session';

interface Session {
  token: string;
  /** Milliseconds since the epoch: when the token stops working. */
  expiresAt: number;
  user: User;
  isAdmin: boolean;
}

interface AuthResponse {
  access_token: string;
  expires_in: number;
  user: User;
  isAdmin: boolean;
}

/** Sign-in or sign-up failed; the message says why in words a person can act on. */
export class AuthError extends Error {}

const messageFor = (error: unknown): string => {
  if (error instanceof HttpErrorResponse) {
    const code = (error.error as { message?: unknown } | null)?.message;
    if (typeof code === 'string' && code in OAUTH_MESSAGES) {
      return OAUTH_MESSAGES[code];
    }
    switch (error.status) {
      case 0:
        return 'Cannot reach the server. Try again in a moment.';
      case 400:
        return 'Check the details and try again.';
      case 401:
        return 'Incorrect email or password.';
      case 403:
        return 'Creating an account is turned off. Sign in instead.';
      case 409:
        return 'An account with this email already exists. Try signing in.';
      case 429:
        return 'Too many attempts. Wait a minute and try again.';
    }
  }
  return 'Something went wrong. Try again.';
};

/**
 * Who is signed in, against the eLogbook API (password, or OAuth via `/auth/callback`).
 * The token is kept in this browser's local storage until it expires, so a reload keeps you signed in.
 */
@Injectable({ providedIn: 'root' })
export class ApiAuthService extends AuthService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(AppConfig);
  private readonly session = signal<Session | null>(this.readSession());

  override readonly user = computed(() => this.session()?.user ?? null);
  override readonly isAdmin = computed(() => this.session()?.isAdmin ?? false);
  /** What the HTTP interceptor sends as the bearer token. */
  readonly token = computed(() => this.session()?.token ?? null);

  async signIn(email: string, password: string): Promise<void> {
    await this.start('/auth/login', { email, password });
  }

  /** The identity provider the API offers, or `null` when OAuth is off. */
  async oauthProvider(): Promise<OAuthProvider | null> {
    try {
      const status = await firstValueFrom(
        this.http.get<{ enabled: boolean; label: string | null; widget: OAuthProvider['widget'] }>(
          `${this.config.apiUrl}/auth/oauth`,
        ),
      );
      return status.enabled && status.label
        ? { label: status.label, widget: status.widget ?? null }
        : null;
    } catch {
      return null; // an API that cannot be reached shows the password form alone
    }
  }

  /** Signs in with the ID token a provider's own button returned. */
  async signInWithCredential(credential: string): Promise<void> {
    await this.start('/auth/oauth/credential', { credential });
  }

  /** Address that starts the provider sign-in. */
  oauthLoginUrl(returnUrl?: string): string {
    const query = returnUrl ? `?${new URLSearchParams({ returnUrl })}` : '';
    return `${this.config.apiUrl}/auth/oauth/login${query}`;
  }

  /** Signs in with a token from the provider flow. */
  async completeOAuth(token: string, expiresInSeconds: number): Promise<void> {
    try {
      const who = await firstValueFrom(
        this.http.get<{ user: User; isAdmin: boolean }>(`${this.config.apiUrl}/auth/whoami`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      );
      this.store({
        token,
        expiresAt: Date.now() + expiresInSeconds * 1000,
        user: who.user,
        isAdmin: who.isAdmin,
      });
    } catch (error) {
      throw new AuthError(messageFor(error));
    }
  }

  async signUp(name: string, email: string, password: string): Promise<void> {
    await this.start('/auth/register', { name, email, password });
  }

  override signOut(): void {
    this.session.set(null);
    this.write(null);
  }

  /** The server no longer accepts the token (it expired, or the account is gone). */
  expire(): void {
    this.signOut();
  }

  private async start(path: string, body: object): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.http.post<AuthResponse>(`${this.config.apiUrl}${path}`, body),
      );
      this.store({
        token: response.access_token,
        expiresAt: Date.now() + response.expires_in * 1000,
        user: response.user,
        isAdmin: response.isAdmin,
      });
    } catch (error) {
      throw new AuthError(messageFor(error));
    }
  }

  private store(session: Session): void {
    this.write(session);
    this.session.set(session);
  }

  private readSession(): Session | null {
    try {
      const stored = JSON.parse(localStorage.getItem(SESSION_KEY) ?? 'null') as Session | null;
      return stored && stored.expiresAt > Date.now() ? stored : null;
    } catch {
      return null;
    }
  }

  private write(session: Session | null): void {
    try {
      if (session) {
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      } else {
        localStorage.removeItem(SESSION_KEY);
      }
    } catch {
      // storage unavailable: the person is signed in until the page is closed
    }
  }
}
