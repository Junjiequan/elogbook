import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { UserIdentity } from '../src/users/entities/user-identity.entity.js';
import { User } from '../src/users/entities/user.entity.js';
import { CLIENT_ID, CLIENT_SECRET, FakeIdentityProvider } from './fake-identity-provider.js';
import { createTestApp, publicApi, resetDatabase, signUp } from './helpers.js';

const API = '/api/v1';
const WEB = 'http://localhost:4300';
const CALLBACK = `${WEB}/api/v1/auth/oauth/callback`;

describe('OAuth sign-in', () => {
  const idp = new FakeIdentityProvider();
  let app: INestApplication;

  const OAUTH_VARIABLES = [
    'OAUTH_ISSUER',
    'OAUTH_CLIENT_ID',
    'OAUTH_CLIENT_SECRET',
    'OAUTH_REDIRECT_URI',
    'OAUTH_FRONTEND_URL',
    'OAUTH_LABEL',
    'OAUTH_ENABLED',
    'OAUTH_ALLOWED_EMAIL_DOMAINS',
    'OAUTH_CREATE_ACCOUNTS',
    'OAUTH_CLIENT_AUTHENTICATION',
  ];

  /** The app, started with these settings in its environment (on top of the working ones). */
  const start = async (env: Record<string, string> = {}) => {
    Object.assign(process.env, {
      OAUTH_LABEL: 'Test IdP',
      OAUTH_ISSUER: idp.issuer,
      OAUTH_CLIENT_ID: CLIENT_ID,
      OAUTH_CLIENT_SECRET: CLIENT_SECRET,
      OAUTH_REDIRECT_URI: CALLBACK,
      OAUTH_FRONTEND_URL: WEB,
      ...env,
    });
    app = await createTestApp();
    await resetDatabase(app);
  };

  /** The browser's whole trip: to the API, to the provider and back. Returns where the API finally sends it. */
  const signInWith = async (
    claims: Record<string, unknown>,
    options: {
      returnUrl?: string;
      tamper?: (query: string) => string;
      cookie?: string | null;
    } = {},
  ) => {
    const server = app.getHttpServer();
    const login = await request(server)
      .get(`${API}/auth/oauth/login`)
      .query(options.returnUrl ? { returnUrl: options.returnUrl } : {})
      .expect(302);
    const cookie = (login.headers['set-cookie'] as unknown as string[])[0].split(';')[0];
    const back = idp.approve(login.headers.location, claims);
    const callback = await request(server)
      .get(`${API}/auth/oauth/callback?${options.tamper?.(back) ?? back}`)
      .set('Cookie', options.cookie === null ? '' : (options.cookie ?? cookie));
    expect(callback.status).toBe(302);
    return { login, callback, location: new URL(callback.headers.location) };
  };

  const googleish = (email: string, over: object = {}) => ({
    sub: `sub-${email}`,
    email,
    email_verified: true,
    name: 'Anna Lindqvist',
    ...over,
  });
  const tokenOf = (location: URL) =>
    new URLSearchParams(location.hash.slice(1)).get('access_token')!;
  const users = () => app.get(DataSource).getRepository(User);
  const identities = () => app.get(DataSource).getRepository(UserIdentity);

  beforeAll(async () => {
    await idp.start();
  });
  afterAll(() => idp.stop());
  afterEach(async () => {
    OAUTH_VARIABLES.forEach((name) => delete process.env[name]);
    await app?.close();
  });

  describe('when it is set up', () => {
    beforeEach(() => start());

    it('says it is available, and what the button is called', async () => {
      const res = await publicApi(app).get('/auth/oauth').expect(200);
      expect(res.body).toEqual({ enabled: true, label: 'Test IdP' });
    });

    it('sends the browser to the provider with state, nonce and a PKCE challenge', async () => {
      const login = await request(app.getHttpServer()).get(`${API}/auth/oauth/login`).expect(302);
      const target = new URL(login.headers.location);

      expect(target.origin + target.pathname).toBe(`${idp.issuer}/authorize`);
      expect(Object.fromEntries(target.searchParams)).toMatchObject({
        client_id: CLIENT_ID,
        redirect_uri: CALLBACK,
        response_type: 'code',
        scope: 'openid email profile',
        code_challenge_method: 'S256',
      });
      for (const key of ['state', 'nonce', 'code_challenge']) {
        expect(target.searchParams.get(key)?.length).toBeGreaterThan(20);
      }
      const cookie = (login.headers['set-cookie'] as unknown as string[])[0];
      expect(cookie).toMatch(/HttpOnly/i);
      expect(cookie).toMatch(/SameSite=Lax/i);
      expect(cookie).not.toContain(target.searchParams.get('state')!); // it is signed, not the bare values
    });

    it('creates the account on the first sign-in and hands the web app an access token', async () => {
      const { location } = await signInWith(googleish('Anna@Example.org'));

      expect(location.origin + location.pathname).toBe(`${WEB}/auth/callback`);
      const who = await request(app.getHttpServer())
        .get(`${API}/auth/whoami`)
        .set('Authorization', `Bearer ${tokenOf(location)}`)
        .expect(200);
      expect(who.body.user).toEqual({
        id: expect.any(String),
        name: 'Anna Lindqvist',
        email: 'anna@example.org',
      });
      expect(new URLSearchParams(location.hash.slice(1)).get('expires_in')).toBe(String(8 * 3600));
      expect(await users().findOneByOrFail({ email: 'anna@example.org' })).toMatchObject({
        invited: false,
      });
    });

    it('keeps only what is needed to recognise the person: the provider, its id for them, and a link', async () => {
      await signInWith(
        googleish('Anna@Example.org', { sub: 'google-123', picture: 'x', locale: 'sv' }),
      );

      const user = await users().findOneByOrFail({ email: 'anna@example.org' });
      expect(await identities().find()).toEqual([
        {
          issuer: idp.issuer,
          subject: 'google-123',
          userId: user.id,
          createdAt: expect.any(Date),
        },
      ]);
      const stored = await app
        .get(DataSource)
        .query('SELECT * FROM users WHERE id = $1', [user.id]);
      expect(Object.keys(stored[0]).sort()).toEqual(
        ['created_at', 'email', 'id', 'invited', 'name', 'password_hash', 'roles'].sort(),
      );
      expect(stored[0].password_hash).toBeNull(); // no password: the provider is how they sign in
    });

    it('recognises a returning person by the provider id, even if their email there has changed', async () => {
      const first = await signInWith(googleish('old@example.org', { sub: 'stable-id' }));
      const second = await signInWith(googleish('new@example.org', { sub: 'stable-id' }));

      const whoami = async (location: URL) =>
        (
          await request(app.getHttpServer())
            .get(`${API}/auth/whoami`)
            .set('Authorization', `Bearer ${tokenOf(location)}`)
            .expect(200)
        ).body.user;
      expect((await whoami(second.location)).id).toBe((await whoami(first.location)).id);
      expect(await users().count()).toBe(1);
      expect(await users().countBy({ email: 'new@example.org' })).toBe(0); // the account keeps its email
    });

    it('refuses a different provider id for an account that is already linked', async () => {
      await signInWith(googleish('anna@example.org', { sub: 'first-person' }));

      const other = await signInWith(googleish('anna@example.org', { sub: 'someone-else' }));

      expect(other.location.searchParams.get('oauthError')).toBe('conflict');
      expect(await identities().count()).toBe(1);
    });

    it('lets two providers be linked to one account', async () => {
      await signInWith(googleish('anna@example.org', { sub: 'a' }));
      await app
        .get(DataSource)
        .query(`UPDATE user_identities SET issuer = 'https://other-provider.example'`);

      const again = await signInWith(googleish('anna@example.org', { sub: 'b' }));

      expect(again.location.pathname).toBe('/auth/callback');
      expect(await identities().count()).toBe(2);
      expect(await users().count()).toBe(1);
    });

    it('forgets the link when the account is deleted', async () => {
      await signInWith(googleish('anna@example.org'));

      await app.get(DataSource).query(`DELETE FROM users`);

      expect(await identities().count()).toBe(0);
    });

    it('signs in to the same account the next time, and to one made with a password', async () => {
      const mine = await signUp(app, 'Anna with a password', 'anna@example.org');

      const { location } = await signInWith(googleish('anna@example.org'));
      const who = await request(app.getHttpServer())
        .get(`${API}/auth/whoami`)
        .set('Authorization', `Bearer ${tokenOf(location)}`)
        .expect(200);

      expect(who.body.user.id).toBe(mine.user.id);
      expect(who.body.user.name).toBe('Anna with a password'); // an existing name is not overwritten
      expect(await users().countBy({ email: 'anna@example.org' })).toBe(1);
      expect(await identities().countBy({ userId: mine.user.id })).toBe(1); // now linked
    });

    it('lets somebody who was invited by email claim the logbooks shared with them', async () => {
      const owner = await signUp(app, 'Owner', 'owner@example.org');
      const logbook = await owner.createLogbook('Shared before sign-in');
      await owner.patch(`/logbooks/${logbook}`, {
        members: [
          { email: owner.email, role: 'owner' },
          { email: 'newcomer@example.org', role: 'editor' },
        ],
      });

      const { location } = await signInWith(
        googleish('newcomer@example.org', { name: 'New Comer' }),
      );
      const list = await request(app.getHttpServer())
        .get(`${API}/logbooks`)
        .set('Authorization', `Bearer ${tokenOf(location)}`)
        .expect(200);

      expect(list.body.map((l: { title: string }) => l.title)).toEqual(['Shared before sign-in']);
      expect(await users().findOneByOrFail({ email: 'newcomer@example.org' })).toMatchObject({
        name: 'New Comer',
        invited: false,
      });
    });

    it('returns to the page the person was heading for, but never to another site', async () => {
      const kept = await signInWith(googleish('a@example.org'), {
        returnUrl: '/logbooks/abc/entries/1',
      });
      expect(new URLSearchParams(kept.location.hash.slice(1)).get('return_to')).toBe(
        '/logbooks/abc/entries/1',
      );

      for (const unsafe of ['//evil.example', 'https://evil.example', '/\\evil.example']) {
        const dropped = await signInWith(googleish('b@example.org'), { returnUrl: unsafe });
        expect(new URLSearchParams(dropped.location.hash.slice(1)).has('return_to'), unsafe).toBe(
          false,
        );
      }
    });

    it('sends the secret and the PKCE verifier to the provider, never to the browser', async () => {
      idp.tokenRequests = [];
      const { callback } = await signInWith(googleish('a@example.org'));

      expect(idp.tokenRequests).toHaveLength(1);
      expect(idp.tokenRequests[0]).toMatchObject({
        client_secret: CLIENT_SECRET,
        grant_type: 'authorization_code',
        redirect_uri: CALLBACK,
      });
      expect(idp.tokenRequests[0].code_verifier?.length).toBeGreaterThan(20);
      expect(callback.headers.location).not.toContain(CLIENT_SECRET);
      expect(callback.headers.location).not.toContain(idp.tokenRequests[0].code_verifier);
    });

    describe('when it goes wrong, the person lands on the sign-in page with the reason', () => {
      const reason = (location: URL) => {
        expect(location.origin + location.pathname).toBe(`${WEB}/login`);
        expect(location.hash).toBe(''); // never a token
        return location.searchParams.get('oauthError');
      };

      it('when the browser comes back without the cookie (or it has expired)', async () => {
        const { location } = await signInWith(googleish('a@example.org'), { cookie: null });
        expect(reason(location)).toBe('expired');
      });

      it('when the cookie is not ours', async () => {
        const { location } = await signInWith(googleish('a@example.org'), {
          cookie: 'elogbook_oauth=not-a-token',
        });
        expect(reason(location)).toBe('expired');
      });

      it('when the state does not match the one we started with', async () => {
        const { location } = await signInWith(googleish('a@example.org'), {
          tamper: (query) => query.replace(/state=[^&]+/, 'state=somebody-elses'),
        });
        expect(reason(location)).toBe('failed');
      });

      it('when the code is not a real one', async () => {
        const { location } = await signInWith(googleish('a@example.org'), {
          tamper: (query) => query.replace(/code=[^&]+/, 'code=forged'),
        });
        expect(reason(location)).toBe('failed');
      });

      it('when a code is used a second time', async () => {
        const server = app.getHttpServer();
        const login = await request(server).get(`${API}/auth/oauth/login`).expect(302);
        const cookie = (login.headers['set-cookie'] as unknown as string[])[0].split(';')[0];
        const back = idp.approve(login.headers.location, googleish('a@example.org'));

        const first = await request(server)
          .get(`${API}/auth/oauth/callback?${back}`)
          .set('Cookie', cookie);
        const second = await request(server)
          .get(`${API}/auth/oauth/callback?${back}`)
          .set('Cookie', cookie);

        expect(new URL(first.headers.location).pathname).toBe('/auth/callback');
        expect(reason(new URL(second.headers.location))).toBe('failed');
      });

      it('when the person says no at the provider', async () => {
        const server = app.getHttpServer();
        const login = await request(server).get(`${API}/auth/oauth/login`).expect(302);
        const cookie = (login.headers['set-cookie'] as unknown as string[])[0].split(';')[0];
        const state = new URL(login.headers.location).searchParams.get('state')!;

        const callback = await request(server)
          .get(`${API}/auth/oauth/callback?error=access_denied&state=${state}`)
          .set('Cookie', cookie);

        expect(reason(new URL(callback.headers.location))).toBe('denied');
      });

      it('when the provider does not vouch for the email', async () => {
        const { location } = await signInWith(
          googleish('a@example.org', { email_verified: false }),
        );
        expect(reason(location)).toBe('unverified');
        expect(await users().countBy({ email: 'a@example.org' })).toBe(0);
      });

      it('when the provider does not say the email is verified at all', async () => {
        const { location } = await signInWith({ sub: 'x', email: 'a@example.org', name: 'A' });
        expect(reason(location)).toBe('unverified');
        expect(await users().count()).toBe(0);
      });

      it('when the provider gives no email at all', async () => {
        const { location } = await signInWith({ sub: 'x', name: 'No Email' });
        expect(reason(location)).toBe('failed');
      });
    });

    it('does not take the sign-in cookie for an access token', async () => {
      const login = await request(app.getHttpServer()).get(`${API}/auth/oauth/login`).expect(302);
      const token = decodeURIComponent(
        (login.headers['set-cookie'] as unknown as string[])[0].split(';')[0].split('=')[1],
      );
      await request(app.getHttpServer())
        .get(`${API}/auth/whoami`)
        .set('Authorization', `Bearer ${token}`)
        .expect(401);
    });
  });

  it('only lets the listed email domains in', async () => {
    await start({ OAUTH_ALLOWED_EMAIL_DOMAINS: 'ess.eu' });

    const denied = await signInWith(googleish('someone@gmail.com'));
    expect(denied.location.searchParams.get('oauthError')).toBe('not_allowed');
    expect(await users().countBy({ email: 'someone@gmail.com' })).toBe(0);

    const allowed = await signInWith(googleish('someone@ESS.eu'));
    expect(allowed.location.pathname).toBe('/auth/callback');
  });

  it('can be told not to create accounts: only people who already have one sign in', async () => {
    await start({ OAUTH_CREATE_ACCOUNTS: 'false' });

    const stranger = await signInWith(googleish('stranger@example.org'));
    expect(stranger.location.searchParams.get('oauthError')).toBe('no_account');
    expect(await users().countBy({ email: 'stranger@example.org' })).toBe(0);

    await signUp(app, 'Known', 'known@example.org');
    const known = await signInWith(googleish('known@example.org'));
    expect(known.location.pathname).toBe('/auth/callback');
  });

  it('can use the other way of sending the client secret (as some providers require)', async () => {
    await start({ OAUTH_CLIENT_AUTHENTICATION: 'client_secret_basic' });
    idp.tokenRequests = [];

    const { location } = await signInWith(googleish('a@example.org'));

    expect(location.pathname).toBe('/auth/callback');
    expect(idp.tokenRequests[0]).not.toHaveProperty('client_secret');
  });

  it('says the provider is unavailable, instead of failing, when it cannot be reached', async () => {
    await start({ OAUTH_ISSUER: 'http://127.0.0.1:1' });

    const login = await request(app.getHttpServer()).get(`${API}/auth/oauth/login`).expect(302);

    expect(new URL(login.headers.location).searchParams.get('oauthError')).toBe('unavailable');
  });

  describe('when it is not set up', () => {
    beforeEach(async () => {
      app = await createTestApp();
    });

    it('says so, and the routes are not there', async () => {
      expect((await publicApi(app).get('/auth/oauth').expect(200)).body).toEqual({
        enabled: false,
        label: null,
      });
      await publicApi(app).get('/auth/oauth/login').expect(404);
      await publicApi(app).get('/auth/oauth/callback').expect(404);
    });
  });

  it('is switched off by OAUTH_ENABLED=false, even with everything else set', async () => {
    await start({ OAUTH_ENABLED: 'false' });
    expect((await publicApi(app).get('/auth/oauth').expect(200)).body.enabled).toBe(false);
  });

  it('refuses to start with settings that are wrong, saying what is wrong', async () => {
    Object.assign(process.env, { OAUTH_ISSUER: 'nope' });
    await expect(createTestApp()).rejects.toThrow(/OAuth sign-in settings are not valid/);
  });
});
