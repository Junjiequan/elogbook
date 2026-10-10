import { createHash, randomUUID } from 'node:crypto';
import { createServer, type IncomingMessage, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { exportJWK, generateKeyPair, SignJWT, type JWK, type CryptoKey } from 'jose';

export const CLIENT_ID = 'elogbook-test-client';
export const CLIENT_SECRET = 'elogbook-test-secret';

interface Grant {
  nonce: string;
  challenge: string;
  redirectUri: string;
  claims: Record<string, unknown>;
}

/**
 * A small OpenID Connect provider that really checks what the API sends (client secret, PKCE, redirect address,
 * one-time codes) and signs real ID tokens, so the e2e tests exercise the same flow as with Google.
 */
export class FakeIdentityProvider {
  private server!: Server;
  private key!: CryptoKey;
  private jwk!: JWK;
  private readonly grants = new Map<string, Grant>();
  issuer = '';
  /** What the provider received at its token endpoint, for tests that want to look. */
  tokenRequests: Record<string, string>[] = [];

  async start(): Promise<void> {
    const { privateKey, publicKey } = await generateKeyPair('RS256');
    this.key = privateKey;
    this.jwk = { ...(await exportJWK(publicKey)), kid: 'test-key', alg: 'RS256', use: 'sig' };
    this.server = createServer((req, res) => void this.handle(req, res));
    await new Promise<void>((done) => this.server.listen(0, '127.0.0.1', done));
    this.issuer = `http://127.0.0.1:${(this.server.address() as AddressInfo).port}`;
  }

  stop(): Promise<void> {
    return new Promise((done) => this.server.close(() => done()));
  }

  /**
   * An ID token as the provider's own button hands it to the browser. `forged` signs it with a key the provider
   * never published; `audience`, `issuer` and `expiresIn` (seconds from now) can be bent to test the checks.
   */
  async issueCredential(
    claims: Record<string, unknown>,
    options: { forged?: boolean; audience?: string; issuer?: string; expiresIn?: number } = {},
  ): Promise<string> {
    const key = options.forged ? (await generateKeyPair('RS256')).privateKey : this.key;
    const now = Math.floor(Date.now() / 1000);
    return new SignJWT({ ...claims })
      .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
      .setIssuer(options.issuer ?? this.issuer)
      .setAudience(options.audience ?? CLIENT_ID)
      .setIssuedAt(now)
      .setExpirationTime(now + (options.expiresIn ?? 300))
      .sign(key);
  }

  /**
   * What the browser does at the provider: the person signs in and agrees. Returns the query string the
   * provider sends the browser back with (`code` and `state`) for the redirect address in `authorizeUrl`.
   */
  approve(authorizeUrl: string, claims: Record<string, unknown>): string {
    const params = new URL(authorizeUrl).searchParams;
    const code = randomUUID();
    this.grants.set(code, {
      nonce: params.get('nonce')!,
      challenge: params.get('code_challenge')!,
      redirectUri: params.get('redirect_uri')!,
      claims,
    });
    return new URLSearchParams({ code, state: params.get('state')!, iss: this.issuer }).toString();
  }

  private async handle(
    req: IncomingMessage,
    res: import('node:http').ServerResponse,
  ): Promise<void> {
    const url = new URL(req.url!, this.issuer);
    const json = (status: number, body: object) => {
      res.writeHead(status, { 'content-type': 'application/json' });
      res.end(JSON.stringify(body));
    };
    if (url.pathname === '/.well-known/openid-configuration') {
      return json(200, {
        issuer: this.issuer,
        authorization_endpoint: `${this.issuer}/authorize`,
        token_endpoint: `${this.issuer}/token`,
        jwks_uri: `${this.issuer}/jwks`,
        response_types_supported: ['code'],
        subject_types_supported: ['public'],
        id_token_signing_alg_values_supported: ['RS256'],
        token_endpoint_auth_methods_supported: ['client_secret_post', 'client_secret_basic'],
        code_challenge_methods_supported: ['S256'],
      });
    }
    if (url.pathname === '/jwks') {
      return json(200, { keys: [this.jwk] });
    }
    if (url.pathname === '/token' && req.method === 'POST') {
      let raw = '';
      for await (const chunk of req) {
        raw += chunk;
      }
      const body = Object.fromEntries(new URLSearchParams(raw));
      this.tokenRequests.push(body);
      const basic = req.headers.authorization?.startsWith('Basic ')
        ? Buffer.from(req.headers.authorization.slice(6), 'base64').toString().split(':')
        : [];
      const clientId = body.client_id ?? decodeURIComponent(basic[0] ?? '');
      const secret = body.client_secret ?? decodeURIComponent(basic[1] ?? '');
      const grant = this.grants.get(body.code ?? '');
      this.grants.delete(body.code ?? ''); // a code works once
      const challenge = createHash('sha256')
        .update(body.code_verifier ?? '')
        .digest('base64url');
      if (
        clientId !== CLIENT_ID ||
        secret !== CLIENT_SECRET ||
        body.grant_type !== 'authorization_code' ||
        !grant ||
        grant.redirectUri !== body.redirect_uri ||
        grant.challenge !== challenge
      ) {
        return json(400, { error: 'invalid_grant' });
      }
      const now = Math.floor(Date.now() / 1000);
      const idToken = await new SignJWT({ nonce: grant.nonce, ...grant.claims })
        .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
        .setIssuer(this.issuer)
        .setAudience(CLIENT_ID)
        .setIssuedAt(now)
        .setExpirationTime(now + 300)
        .sign(this.key);
      return json(200, {
        access_token: randomUUID(),
        token_type: 'Bearer',
        expires_in: 3600,
        id_token: idToken,
      });
    }
    json(404, { error: 'not_found' });
  }
}
