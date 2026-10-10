import { computed, inject, Injectable, signal } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { DEMO_USERS } from '../../../demo/demo-users';
import type { User } from '../../core/models/logbook.models';
import { decodeGoogleCredential } from './google-identity';
import { hashPassword, newSalt } from './password-hasher';
import { ADMIN_EMAILS, DEMO_PASSWORD, GOOGLE_CLIENT_ID } from './test-auth.config';

const ACCOUNTS_KEY = 'elogbook.test-auth.accounts';
const SESSION_KEY = 'elogbook.test-auth.session';

interface Account {
  email: string;
  name: string;
  salt: string;
  hash: string;
}

export class AuthError extends Error {}

/** A user's id is their lower-case email, so sharing by email works before the person has signed up. */
export const normaliseEmail = (email: string): string => email.trim().toLowerCase();

/**
 * TEST-ONLY authentication. Accounts live in this browser's localStorage; there is no server, no
 * email verification and no real security. Replace with an OIDC-backed `AuthService` and delete
 * this folder.
 */
@Injectable()
export class TestAuthService extends AuthService {
  private readonly googleClientId = inject(GOOGLE_CLIENT_ID);
  private readonly _user = signal<User | null>(this.readSession());
  private seeding?: Promise<void>;

  override readonly user = this._user.asReadonly();
  override readonly isAdmin = computed(() => ADMIN_EMAILS.includes(this._user()?.email ?? ''));

  async signUp(name: string, email: string, password: string): Promise<void> {
    await this.ensureDemoAccounts();
    const accounts = this.readAccounts();
    const key = normaliseEmail(email);
    if (accounts.some((a) => a.email === key)) {
      throw new AuthError('An account with this email already exists. Try signing in.');
    }
    accounts.push(await this.createAccount(name.trim(), key, password));
    this.writeAccounts(accounts);
    this.startSession({ id: key, name: name.trim(), email: key });
  }

  async signIn(email: string, password: string): Promise<void> {
    await this.ensureDemoAccounts();
    const account = this.readAccounts().find((a) => a.email === normaliseEmail(email));
    const ok = !!account && (await hashPassword(password, account.salt)) === account.hash;
    if (!account || !ok) {
      throw new AuthError('Incorrect email or password.');
    }
    this.startSession({ id: account.email, name: account.name, email: account.email });
  }

  /** Completes "Sign in with Google" from the ID token Google hands the browser. */
  signInWithGoogle(credential: string): void {
    const profile = decodeGoogleCredential(credential, this.googleClientId);
    const email = normaliseEmail(profile.email);
    this.startSession({ id: email, name: profile.name, email });
  }

  override signOut(): void {
    this._user.set(null);
    this.write(SESSION_KEY, null);
  }

  private startSession(user: User): void {
    this.write(SESSION_KEY, user);
    this._user.set(user);
  }

  private ensureDemoAccounts(): Promise<void> {
    this.seeding ??= (async () => {
      const accounts = this.readAccounts();
      let changed = false;
      for (const demo of DEMO_USERS) {
        if (!accounts.some((a) => a.email === demo.email)) {
          accounts.push(await this.createAccount(demo.name, demo.email, DEMO_PASSWORD));
          changed = true;
        }
      }
      if (changed) {
        this.writeAccounts(accounts);
      }
    })();
    return this.seeding;
  }

  private async createAccount(name: string, email: string, password: string): Promise<Account> {
    const salt = newSalt();
    return { email, name, salt, hash: await hashPassword(password, salt) };
  }

  private readAccounts(): Account[] {
    return this.read<Account[]>(ACCOUNTS_KEY) ?? [];
  }

  private writeAccounts(accounts: Account[]): void {
    this.write(ACCOUNTS_KEY, accounts);
  }

  private readSession(): User | null {
    const user = this.read<User>(SESSION_KEY);
    return user && typeof user.id === 'string' && typeof user.email === 'string' ? user : null;
  }

  private read<T>(key: string): T | null {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }

  private write(key: string, value: unknown): void {
    try {
      if (value === null) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, JSON.stringify(value));
      }
    } catch {
      throw new AuthError('Browser storage is unavailable, so accounts cannot be saved.');
    }
  }
}
