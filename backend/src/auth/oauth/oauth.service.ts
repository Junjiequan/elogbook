import { createHmac } from 'node:crypto';
import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import * as client from 'openid-client';
import type { AppConfig } from '../../config/configuration.js';
import type { User } from '../../users/entities/user.entity.js';
import { IdentityConflictError, UsersService } from '../../users/users.service.js';
import { AuthService } from '../auth.service.js';
import type { AuthResponseDto } from '../dto/auth-response.dto.js';
import {
  parseOAuthSettings,
  widgetFor,
  type OAuthSettings,
  type OAuthWidget,
} from './oauth-settings.js';

/** Why a sign-in failed. */
export type OAuthFailure =
  | 'unavailable' // the provider cannot be reached
  | 'denied' // the person said no at the provider
  | 'expired' // took too long, or the browser lost the cookie
  | 'failed' // the provider's answer did not check out
  | 'unverified' // the provider does not vouch for the email
  | 'conflict' // the account is already linked to somebody else at the provider
  | 'not_allowed' // the email's domain is not on the list
  | 'no_account'; // nobody with that email and accounts are not created automatically

export class OAuthError extends Error {
  constructor(readonly code: OAuthFailure) {
    super(code);
  }
}

/** The claims of an ID token that matter here. */
interface Claims {
  sub?: string;
  email?: unknown;
  email_verified?: unknown;
  name?: unknown;
}

/** Kept in a short-lived cookie between login and callback. */
interface Pending {
  typ: 'oauth';
  state: string;
  nonce: string;
  verifier: string;
  returnUrl: string | null;
}

export const COOKIE = 'elogbook_oauth';
export const COOKIE_SECONDS = 10 * 60;

/** OpenID Connect sign-in (code flow with PKCE); any provider via the `OAUTH_*` settings. */
@Injectable()
export class OAuthService implements OnApplicationBootstrap {
  private readonly logger = new Logger(OAuthService.name);
  private settings: OAuthSettings | null = null;
  private discovery: Promise<client.Configuration> | null = null;
  private keys: ReturnType<typeof createRemoteJWKSet> | null = null;

  constructor(
    private readonly config: ConfigService<AppConfig, true>,
    private readonly users: UsersService,
    private readonly auth: AuthService,
    private readonly jwt: JwtService,
  ) {}

  onApplicationBootstrap(): void {
    this.settings = parseOAuthSettings(this.config.get('oauth', { infer: true }));
    if (this.settings) {
      this.logger.log(`OAuth sign-in through ${this.settings.label} (${this.settings.issuer}).`);
    }
  }

  /** Button text; `null` when off. */
  get label(): string | null {
    return this.settings?.label ?? null;
  }

  /** Provider address to redirect to, and the cookie to set. */
  async begin(returnUrl: string | undefined): Promise<{ location: string; cookie: string }> {
    const settings = this.required();
    const configuration = await this.configuration(settings);
    const pending: Pending = {
      typ: 'oauth',
      state: client.randomState(),
      nonce: client.randomNonce(),
      verifier: client.randomPKCECodeVerifier(),
      returnUrl: safePath(returnUrl),
    };
    const location = client.buildAuthorizationUrl(configuration, {
      redirect_uri: settings.redirectUri,
      scope: settings.scopes.join(' '),
      state: pending.state,
      nonce: pending.nonce,
      code_challenge: await client.calculatePKCECodeChallenge(pending.verifier),
      code_challenge_method: 'S256',
    });
    return {
      location: location.href,
      cookie: this.jwt.sign(pending, { secret: this.cookieSecret(), expiresIn: COOKIE_SECONDS }),
    };
  }

  /** Completes the sign-in from the provider's answer and the cookie. */
  async finish(
    query: URLSearchParams,
    cookie: string | undefined,
  ): Promise<{ session: AuthResponseDto; returnUrl: string | null; frontendUrl: string }> {
    const settings = this.required();
    if (query.has('error')) {
      this.logger.warn(`The provider refused: ${query.get('error')}`);
      throw new OAuthError(query.get('error') === 'access_denied' ? 'denied' : 'failed');
    }
    const pending = this.readCookie(cookie);

    let claims: Claims | undefined;
    try {
      const configuration = await this.configuration(settings);
      const callback = new URL(settings.redirectUri);
      callback.search = query.toString();
      const tokens = await client.authorizationCodeGrant(configuration, callback, {
        pkceCodeVerifier: pending.verifier,
        expectedState: pending.state,
        expectedNonce: pending.nonce,
        idTokenExpected: true,
      });
      claims = tokens.claims();
    } catch (error) {
      this.logger.warn(`Sign-in through ${settings.label} failed: ${(error as Error).message}`);
      throw new OAuthError('failed');
    }

    const user = await this.userFor(claims, settings);
    return {
      session: await this.auth.login(user),
      returnUrl: pending.returnUrl,
      frontendUrl: settings.frontendUrl,
    };
  }

  /** Signs in with an ID token the browser got from the provider's own widget (Google's button). */
  async signInWithCredential(credential: string): Promise<AuthResponseDto> {
    const settings = this.required();
    const metadata = (await this.configuration(settings)).serverMetadata();
    let claims: Claims;
    try {
      this.keys ??= createRemoteJWKSet(new URL(metadata.jwks_uri!));
      // Google writes its issuer both with and without the scheme.
      const issuers = [metadata.issuer, metadata.issuer.replace(/^https:\/\//, '')];
      claims = (
        await jwtVerify(credential, this.keys, { issuer: issuers, audience: settings.clientId })
      ).payload;
    } catch (error) {
      this.logger.warn(`ID token from ${settings.label} refused: ${(error as Error).message}`);
      throw new OAuthError('failed');
    }
    return this.auth.login(await this.userFor(claims, settings));
  }

  /** The checks every sign-in passes, and the person's account. */
  private async userFor(claims: Claims | undefined, settings: OAuthSettings): Promise<User> {
    const email = typeof claims?.email === 'string' ? claims.email.trim().toLowerCase() : '';
    if (!email || !claims?.sub) {
      throw new OAuthError('failed');
    }
    // The provider must vouch for the email: it is what finds the account on a first sign-in.
    if (claims.email_verified !== true && claims.email_verified !== 'true') {
      throw new OAuthError('unverified');
    }
    const domain = email.split('@')[1] ?? '';
    if (settings.allowedEmailDomains.length > 0 && !settings.allowedEmailDomains.includes(domain)) {
      throw new OAuthError('not_allowed');
    }
    let user;
    try {
      user = await this.users.signInWithIdentity(
        {
          issuer: settings.issuer,
          subject: claims.sub,
          email,
          name: typeof claims.name === 'string' ? claims.name : '',
        },
        settings.createAccounts,
      );
    } catch (error) {
      if (error instanceof IdentityConflictError) {
        throw new OAuthError('conflict');
      }
      throw error;
    }
    if (!user) {
      throw new OAuthError('no_account');
    }
    return user;
  }

  /** What the web app needs to draw the provider's own sign-in component; `null` when it has none. */
  get widget(): OAuthWidget | null {
    return widgetFor(this.settings);
  }

  /** For redirecting failures. */
  frontendUrl(): string | null {
    return this.settings?.frontendUrl ?? null;
  }

  private required(): OAuthSettings {
    if (!this.settings) {
      throw new OAuthError('unavailable');
    }
    return this.settings;
  }

  /** Lazy, so the API starts while the provider is down. */
  private configuration(settings: OAuthSettings): Promise<client.Configuration> {
    this.discovery ??= client
      .discovery(
        new URL(settings.issuer),
        settings.clientId,
        undefined,
        (settings.clientAuthentication === 'client_secret_basic'
          ? client.ClientSecretBasic
          : client.ClientSecretPost)(settings.clientSecret),
        new URL(settings.issuer).protocol === 'http:'
          ? { execute: [client.allowInsecureRequests] }
          : undefined,
      )
      .catch((error: unknown) => {
        this.discovery = null; // try again next time
        this.logger.error(`Cannot reach ${settings.issuer}: ${(error as Error).message}`);
        throw new OAuthError('unavailable');
      });
    return this.discovery;
  }

  private readCookie(cookie: string | undefined): Pending {
    try {
      const pending = this.jwt.verify<Pending>(cookie ?? '', { secret: this.cookieSecret() });
      if (pending.typ === 'oauth') {
        return pending;
      }
    } catch {
      // expired, missing or not ours
    }
    throw new OAuthError('expired');
  }

  /** Differs from the token secret, so the cookie is never a valid access token. */
  private cookieSecret(): string {
    return createHmac('sha256', this.config.get('jwt.secret', { infer: true }))
      .update('elogbook-oauth-cookie')
      .digest('hex');
  }
}

/** In-app paths only. */
export function safePath(value: string | undefined): string | null {
  return value && value.startsWith('/') && !value.startsWith('//') && !value.startsWith('/\\')
    ? value
    : null;
}
