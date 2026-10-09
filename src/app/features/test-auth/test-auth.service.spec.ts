import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DEMO_USERS } from '../../core/data-access/demo-data';
import { decodeGoogleCredential } from './google-identity';
import { DEMO_PASSWORD, GOOGLE_CLIENT_ID } from './test-auth.config';
import { AuthError, TestAuthService } from './test-auth.service';

const CLIENT_ID = 'client-123.apps.googleusercontent.com';
const KEYS = ['elogbook.test-auth.accounts', 'elogbook.test-auth.session'];

function fakeJwt(claims: Record<string, unknown>): string {
  const encode = (value: unknown) =>
    btoa(JSON.stringify(value)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${encode({ alg: 'RS256' })}.${encode(claims)}.signature`;
}

const validClaims = (overrides: Record<string, unknown> = {}) => ({
  iss: 'https://accounts.google.com',
  aud: CLIENT_ID,
  exp: Math.floor(Date.now() / 1000) + 600,
  email: 'Grace.Hopper@Example.org',
  email_verified: true,
  name: 'Grace Hopper',
  ...overrides,
});

describe('TestAuthService', () => {
  const create = () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        TestAuthService,
        { provide: GOOGLE_CLIENT_ID, useValue: CLIENT_ID },
      ],
    });
    return TestBed.inject(TestAuthService);
  };

  beforeEach(() => KEYS.forEach((k) => localStorage.removeItem(k)));
  afterEach(() => KEYS.forEach((k) => localStorage.removeItem(k)));

  it('signs up, signs in the new user, and uses the lower-case email as the id', async () => {
    const auth = create();
    await auth.signUp('Ada Lovelace', ' Ada@Example.org ', 'correct-horse');

    expect(auth.user()).toEqual({
      id: 'ada@example.org',
      name: 'Ada Lovelace',
      email: 'ada@example.org',
    });
  });

  it('rejects a duplicate email regardless of case', async () => {
    const auth = create();
    await auth.signUp('Ada', 'ada@example.org', 'correct-horse');

    await expectAsync(
      auth.signUp('Other', 'ADA@example.org', 'another-pass'),
    ).toBeRejectedWithError(AuthError);
  });

  it('signs in with the right password and rejects the wrong one', async () => {
    const auth = create();
    await auth.signUp('Ada', 'ada@example.org', 'correct-horse');
    auth.signOut();

    await expectAsync(auth.signIn('ada@example.org', 'wrong')).toBeRejectedWithError(
      'Incorrect email or password.',
    );
    expect(auth.user()).toBeNull();

    await auth.signIn('ADA@example.org', 'correct-horse');
    expect(auth.user()?.id).toBe('ada@example.org');
  });

  it('never stores the password in plain text', async () => {
    await create().signUp('Ada', 'ada@example.org', 'correct-horse');

    expect(localStorage.getItem('elogbook.test-auth.accounts')).not.toContain('correct-horse');
  });

  it('keeps the session across reloads until sign-out', async () => {
    await create().signUp('Ada', 'ada@example.org', 'correct-horse');
    const reloaded = create();
    expect(reloaded.user()?.email).toBe('ada@example.org');

    reloaded.signOut();
    expect(create().user()).toBeNull();
  });

  it('accepts the seeded demo accounts', async () => {
    const auth = create();
    await auth.signIn(DEMO_USERS[0].email, DEMO_PASSWORD);

    expect(auth.user()?.id).toBe(DEMO_USERS[0].id);
  });

  it('signs in with a valid Google credential', () => {
    const auth = create();
    auth.signInWithGoogle(fakeJwt(validClaims()));

    expect(auth.user()).toEqual({
      id: 'grace.hopper@example.org',
      name: 'Grace Hopper',
      email: 'grace.hopper@example.org',
    });
  });
});

describe('decodeGoogleCredential', () => {
  it('rejects a token issued for another app', () => {
    expect(() =>
      decodeGoogleCredential(fakeJwt(validClaims({ aud: 'someone-else' })), CLIENT_ID),
    ).toThrowError();
  });

  it('rejects an expired token', () => {
    const expired = validClaims({ exp: Math.floor(Date.now() / 1000) - 10 });
    expect(() => decodeGoogleCredential(fakeJwt(expired), CLIENT_ID)).toThrowError(/expired/);
  });

  it('rejects an unverified email', () => {
    const claims = validClaims({ email_verified: false });
    expect(() => decodeGoogleCredential(fakeJwt(claims), CLIENT_ID)).toThrowError(/not verified/);
  });

  it('rejects garbage', () => {
    expect(() => decodeGoogleCredential('not-a-jwt', CLIENT_ID)).toThrowError(/Invalid/);
  });
});
