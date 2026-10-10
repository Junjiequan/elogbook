import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TEST_USERS } from '../../testing/test-users';
import { ApiAuthService, AuthError } from './api-auth.service';

const [anna] = TEST_USERS;
const SESSION_KEY = 'elogbook.session';
const reply = (isAdmin = false) => ({
  access_token: 'token-1',
  expires_in: 3600,
  user: anna,
  isAdmin,
});

describe('ApiAuthService', () => {
  let http: HttpTestingController;

  const create = (): ApiAuthService => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    return TestBed.inject(ApiAuthService);
  };

  beforeEach(() => localStorage.removeItem(SESSION_KEY));
  afterEach(() => {
    http.verify();
    localStorage.removeItem(SESSION_KEY);
  });

  it('starts signed out', () => {
    const auth = create();

    expect(auth.user()).toBeNull();
    expect(auth.token()).toBeNull();
    expect(auth.isAdmin()).toBe(false);
  });

  it('signs in with the email and password, and then knows who and what the token is', async () => {
    const auth = create();

    const done = auth.signIn('anna.lindqvist@example.org', 'secret');
    const request = http.expectOne('/api/v1/auth/login');
    expect(request.request.body).toEqual({
      email: 'anna.lindqvist@example.org',
      password: 'secret',
    });
    request.flush(reply(true));
    await done;

    expect(auth.user()).toEqual(anna);
    expect(auth.token()).toBe('token-1');
    expect(auth.isAdmin()).toBe(true);
  });

  it('signs up with a name, an email and a password', async () => {
    const auth = create();

    const done = auth.signUp('Anna Lindqvist', 'anna@example.org', 'long enough');
    const request = http.expectOne('/api/v1/auth/register');
    expect(request.request.body).toEqual({
      name: 'Anna Lindqvist',
      email: 'anna@example.org',
      password: 'long enough',
    });
    request.flush(reply());
    await done;

    expect(auth.user()).toEqual(anna);
  });

  it('stays signed in after a reload, until the token runs out', async () => {
    const first = create();
    const done = first.signIn('a@example.org', 'x');
    http.expectOne('/api/v1/auth/login').flush(reply());
    await done;

    expect(create().user()).toEqual(anna);

    const stored = JSON.parse(localStorage.getItem(SESSION_KEY)!);
    localStorage.setItem(SESSION_KEY, JSON.stringify({ ...stored, expiresAt: Date.now() - 1 }));
    expect(create().user()).toBeNull();
  });

  it('forgets everything when signing out', async () => {
    const auth = create();
    const done = auth.signIn('a@example.org', 'x');
    http.expectOne('/api/v1/auth/login').flush(reply());
    await done;

    auth.signOut();

    expect(auth.user()).toBeNull();
    expect(auth.token()).toBeNull();
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
  });

  describe('signing in through the identity provider (OAuth)', () => {
    it('knows the provider when the API offers one, and nothing otherwise', async () => {
      const auth = create();
      const widget = { kind: 'google', clientId: 'c.apps.googleusercontent.com' };

      const withWidget = auth.oauthProvider();
      http.expectOne('/api/v1/auth/oauth').flush({ enabled: true, label: 'Google', widget });
      expect(await withWidget).toEqual({ label: 'Google', widget });

      const without = auth.oauthProvider();
      http.expectOne('/api/v1/auth/oauth').flush({ enabled: true, label: 'Ping', widget: null });
      expect(await without).toEqual({ label: 'Ping', widget: null });

      const off = auth.oauthProvider();
      http.expectOne('/api/v1/auth/oauth').flush({ enabled: false, label: null, widget: null });
      expect(await off).toBeNull();

      const unreachable = auth.oauthProvider();
      http.expectOne('/api/v1/auth/oauth').flush({}, { status: 0, statusText: '' });
      expect(await unreachable).toBeNull();
    });

    it("signs in with the ID token from the provider's own component", async () => {
      const auth = create();

      const done = auth.signInWithCredential('the-id-token');
      const request = http.expectOne('/api/v1/auth/oauth/credential');
      expect(request.request.body).toEqual({ credential: 'the-id-token' });
      request.flush(reply());
      await done;

      expect(auth.user()).toEqual(anna);
      expect(auth.token()).toBe('token-1');
    });

    it.each([
      [401, 'failed', 'did not work'],
      [403, 'not_allowed', 'not allowed'],
      [403, 'unverified', 'not verified'],
      [403, 'conflict', 'different account'],
      [403, 'no_account', 'no account'],
      [503, 'unavailable', 'cannot be reached'],
    ])('explains a refused ID token: %i %s', async (status, code, words) => {
      const auth = create();

      const done = auth.signInWithCredential('token');
      http
        .expectOne('/api/v1/auth/oauth/credential')
        .flush({ statusCode: status, message: code }, { status, statusText: 'x' });

      const error = await done.catch((e: unknown) => e);
      expect(error).toBeInstanceOf(AuthError);
      expect((error as AuthError).message).toContain(words);
      expect(auth.user()).toBeNull();
    });

    it('builds the address that starts the sign-in, with where to return to', () => {
      const auth = create();

      expect(auth.oauthLoginUrl()).toBe('/api/v1/auth/oauth/login');
      expect(auth.oauthLoginUrl('/logbooks/a b?x=1')).toBe(
        '/api/v1/auth/oauth/login?returnUrl=%2Flogbooks%2Fa+b%3Fx%3D1',
      );
    });

    it('signs in with the token the API handed over, after asking who it belongs to', async () => {
      const auth = create();

      const done = auth.completeOAuth('token-9', 3600);
      const request = http.expectOne('/api/v1/auth/whoami');
      expect(request.request.headers.get('Authorization')).toBe('Bearer token-9');
      request.flush({ user: anna, isAdmin: true });
      await done;

      expect(auth.user()).toEqual(anna);
      expect(auth.token()).toBe('token-9');
      expect(auth.isAdmin()).toBe(true);
      expect(create().user()).toEqual(anna); // kept for a reload, like any other sign-in
    });

    it('does not sign in when the token turns out to be no good', async () => {
      const auth = create();

      const done = auth.completeOAuth('forged', 3600);
      http.expectOne('/api/v1/auth/whoami').flush({}, { status: 401, statusText: 'Unauthorized' });

      await expect(done).rejects.toBeInstanceOf(AuthError);
      expect(auth.user()).toBeNull();
      expect(localStorage.getItem(SESSION_KEY)).toBeNull();
    });
  });

  describe('says why it failed, in words a person can act on', () => {
    const failWith = async (status: number, statusText: string) => {
      const auth = create();
      const done = auth.signIn('a@example.org', 'x');
      http.expectOne('/api/v1/auth/login').flush({}, { status, statusText });
      const error = await done.catch((e: unknown) => e);
      expect(auth.user()).toBeNull();
      expect(error).toBeInstanceOf(AuthError);
      return (error as AuthError).message;
    };

    it('wrong password', async () => {
      expect(await failWith(401, 'Unauthorized')).toBe('Incorrect email or password.');
    });

    it('too many attempts', async () => {
      expect(await failWith(429, 'Too Many Requests')).toContain('Too many attempts');
    });

    it('email taken', async () => {
      expect(await failWith(409, 'Conflict')).toContain('already exists');
    });

    it('sign-up turned off', async () => {
      expect(await failWith(403, 'Forbidden')).toContain('turned off');
    });

    it('server unreachable', async () => {
      expect(await failWith(0, '')).toContain('Cannot reach the server');
    });
  });
});
