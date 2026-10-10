import type { AppConfig } from '../../config/configuration.js';

/** The `OAUTH_*` settings. */
export interface OAuthSettings {
  /** Button text. */
  label: string;
  /** Provider address; its `/.well-known/openid-configuration` gives the rest. */
  issuer: string;
  clientId: string;
  clientSecret: string;
  /** How the secret reaches the token endpoint. */
  clientAuthentication: 'client_secret_post' | 'client_secret_basic';
  /** Must match the address registered with the provider. */
  redirectUri: string;
  /** Where people land afterwards. */
  frontendUrl: string;
  scopes: string[];
  /** Empty allows any. */
  allowedEmailDomains: string[];
  /** Make an account on first sign-in. */
  createAccounts: boolean;
}

/** A provider's own sign-in component that the web app can draw. Only Google has one so far. */
export interface OAuthWidget {
  kind: 'google';
  clientId: string;
}

export function widgetFor(settings: OAuthSettings | null): OAuthWidget | null {
  return settings && new URL(settings.issuer).hostname === 'accounts.google.com'
    ? { kind: 'google', clientId: settings.clientId }
    : null;
}

export const PLACEHOLDER = /^CHANGE-ME/i;

const LOCAL_HOST = /^(localhost|127\.0\.0\.1|\[::1\])$/;

/** https, or http on localhost. */
function checkUrl(value: string | undefined, name: string, problems: string[]): string {
  if (!value) {
    problems.push(`${name} is required (a web address)`);
    return '';
  }
  try {
    const url = new URL(value);
    const ok =
      url.protocol === 'https:' || (url.protocol === 'http:' && LOCAL_HOST.test(url.hostname));
    if (!ok) {
      problems.push(`${name} must start with https:// (http:// is only allowed for localhost)`);
    }
  } catch {
    problems.push(`${name} is not a web address`);
  }
  return value;
}

/** Validates the settings, listing every problem; `null` when off. */
export function parseOAuthSettings(raw: AppConfig['oauth']): OAuthSettings | null {
  if (!raw.enabled || !raw.issuer) {
    return null;
  }
  const problems: string[] = [];

  const issuer = checkUrl(raw.issuer, 'OAUTH_ISSUER', problems);
  const redirectUri = checkUrl(raw.redirectUri, 'OAUTH_REDIRECT_URI', problems);
  const frontendUrl = checkUrl(raw.frontendUrl, 'OAUTH_FRONTEND_URL', problems);

  const required = (name: string, value: string | undefined): string => {
    if (!value?.trim()) {
      problems.push(`${name} is required`);
      return '';
    }
    if (PLACEHOLDER.test(value)) {
      problems.push(`${name} is still the placeholder from the example file`);
    }
    return value.trim();
  };
  const clientId = required('OAUTH_CLIENT_ID', raw.clientId);
  const clientSecret = required('OAUTH_CLIENT_SECRET', raw.clientSecret);

  const scopes = raw.scopes.length > 0 ? raw.scopes : ['openid', 'email', 'profile'];
  if (!scopes.includes('openid')) {
    problems.push('OAUTH_SCOPES must include "openid"');
  }

  const clientAuthentication = raw.clientAuthentication?.trim() || 'client_secret_post';
  if (
    clientAuthentication !== 'client_secret_post' &&
    clientAuthentication !== 'client_secret_basic'
  ) {
    problems.push('OAUTH_CLIENT_AUTHENTICATION must be client_secret_post or client_secret_basic');
  }

  if (problems.length > 0) {
    throw new Error(`The OAuth sign-in settings are not valid:\n - ${problems.join('\n - ')}`);
  }
  return {
    label: raw.label?.trim() || 'OAuth',
    issuer,
    clientId,
    clientSecret,
    clientAuthentication: clientAuthentication as OAuthSettings['clientAuthentication'],
    redirectUri,
    frontendUrl: frontendUrl.replace(/\/+$/, ''),
    scopes,
    allowedEmailDomains: raw.allowedEmailDomains.map((domain) =>
      domain.replace(/^@/, '').toLowerCase(),
    ),
    createAccounts: raw.createAccounts,
  };
}
