import type { AppConfig } from '../../config/configuration.js';
import { parseOAuthSettings, widgetFor } from './oauth-settings.js';

const google = (over: Partial<AppConfig['oauth']> = {}): AppConfig['oauth'] => ({
  enabled: true,
  label: 'Google',
  issuer: 'https://accounts.google.com',
  clientId: '123.apps.googleusercontent.com',
  clientSecret: 'a-real-secret',
  clientAuthentication: undefined,
  redirectUri: 'https://elogbook.example.org/api/v1/auth/oauth/callback',
  frontendUrl: 'https://elogbook.example.org/',
  scopes: [],
  allowedEmailDomains: [],
  createAccounts: true,
  ...over,
});

describe('widgetFor', () => {
  it("is Google's own button, with the client id, for Google", () => {
    expect(widgetFor(parseOAuthSettings(google()))).toEqual({
      kind: 'google',
      clientId: '123.apps.googleusercontent.com',
    });
  });

  it('is nothing for a provider without a component of its own, or when off', () => {
    expect(
      widgetFor(parseOAuthSettings(google({ issuer: 'https://login.pingone.eu/abc' }))),
    ).toBeNull();
    expect(widgetFor(null)).toBeNull();
  });
});

describe('parseOAuthSettings', () => {
  it('accepts the Google setup and fills in the defaults', () => {
    expect(parseOAuthSettings(google())).toEqual({
      label: 'Google',
      issuer: 'https://accounts.google.com',
      clientId: '123.apps.googleusercontent.com',
      clientSecret: 'a-real-secret',
      clientAuthentication: 'client_secret_post',
      redirectUri: 'https://elogbook.example.org/api/v1/auth/oauth/callback',
      frontendUrl: 'https://elogbook.example.org',
      scopes: ['openid', 'email', 'profile'],
      allowedEmailDomains: [],
      createAccounts: true,
    });
  });

  it('is off without an issuer, or with OAUTH_ENABLED=false, whatever else is set', () => {
    expect(parseOAuthSettings(google({ issuer: undefined }))).toBeNull();
    expect(parseOAuthSettings(google({ enabled: false, clientId: 'CHANGE-ME' }))).toBeNull();
  });

  it('calls it "OAuth" when no label is given', () => {
    expect(parseOAuthSettings(google({ label: undefined }))?.label).toBe('OAuth');
  });

  it('lets a provider on this machine use plain http, and nobody else', () => {
    const local = google({
      issuer: 'http://localhost:9000',
      redirectUri: 'http://localhost:4300/api/v1/auth/oauth/callback',
      frontendUrl: 'http://localhost:4300',
    });
    expect(parseOAuthSettings(local)?.issuer).toBe('http://localhost:9000');
    expect(() => parseOAuthSettings(google({ issuer: 'http://idp.example.org' }))).toThrow(
      /OAUTH_ISSUER must start with https/,
    );
  });

  it('refuses the placeholders of the example', () => {
    expect(() =>
      parseOAuthSettings(google({ clientId: 'CHANGE-ME.apps.googleusercontent.com' })),
    ).toThrow(/OAUTH_CLIENT_ID.*placeholder/);
  });

  it('normalises domains and checks the scopes and the way the secret is sent', () => {
    expect(
      parseOAuthSettings(google({ allowedEmailDomains: ['@ESS.eu', 'example.org'] }))
        ?.allowedEmailDomains,
    ).toEqual(['ess.eu', 'example.org']);
    expect(() => parseOAuthSettings(google({ scopes: ['email'] }))).toThrow(/include "openid"/);
    expect(() => parseOAuthSettings(google({ clientAuthentication: 'private_key_jwt' }))).toThrow(
      /OAUTH_CLIENT_AUTHENTICATION/,
    );
    expect(
      parseOAuthSettings(google({ clientAuthentication: 'client_secret_basic' }))
        ?.clientAuthentication,
    ).toBe('client_secret_basic');
  });

  it('says everything that is wrong at once', () => {
    expect(() =>
      parseOAuthSettings(
        google({
          issuer: 'nope',
          redirectUri: undefined,
          frontendUrl: undefined,
          clientId: undefined,
          clientSecret: undefined,
        }),
      ),
    ).toThrow(
      /OAUTH_ISSUER[\s\S]*OAUTH_REDIRECT_URI[\s\S]*OAUTH_FRONTEND_URL[\s\S]*OAUTH_CLIENT_ID[\s\S]*OAUTH_CLIENT_SECRET/,
    );
  });
});
