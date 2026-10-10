import { Controller, Get, Query, Req, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { authLimit } from '../auth-limit.js';
import { Public } from '../decorators/public.decorator.js';
import { COOKIE, COOKIE_SECONDS, OAuthError, OAuthService } from './oauth.service.js';

/** One cookie from the request (no cookie parser needed). */
function cookieOf(request: Request, name: string): string | undefined {
  for (const part of (request.headers.cookie ?? '').split(';')) {
    const [key, ...value] = part.trim().split('=');
    if (key === name) {
      return decodeURIComponent(value.join('='));
    }
  }
  return undefined;
}

@ApiTags('auth')
@Controller('auth/oauth')
export class OAuthController {
  constructor(private readonly oauth: OAuthService) {}

  /** Whether OAuth is set up, and its button text. */
  @Public()
  @Get()
  status(): { enabled: boolean; label: string | null } {
    return { enabled: this.oauth.label !== null, label: this.oauth.label };
  }

  /** Redirects the browser to the provider. */
  @Public()
  @Throttle(authLimit)
  @Get('login')
  async login(@Query('returnUrl') returnUrl: string | undefined, @Res() response: Response) {
    try {
      const { location, cookie } = await this.oauth.begin(returnUrl);
      response.cookie(COOKIE, cookie, {
        httpOnly: true,
        // lax: the provider's redirect back must carry it
        sameSite: 'lax',
        secure: response.req.secure,
        path: '/',
        maxAge: COOKIE_SECONDS * 1000,
      });
      response.setHeader('Cache-Control', 'no-store');
      response.redirect(location);
    } catch (error) {
      this.fail(response, error);
    }
  }

  /** The provider redirects back here; hands the web app its token. */
  @Public()
  @Throttle(authLimit)
  @Get('callback')
  async callback(@Req() request: Request, @Res() response: Response) {
    try {
      const query = new URLSearchParams(request.url.split('?')[1] ?? '');
      const { session, returnUrl, frontendUrl } = await this.oauth.finish(
        query,
        cookieOf(request, COOKIE),
      );
      response.clearCookie(COOKIE, { path: '/' });
      response.setHeader('Cache-Control', 'no-store');
      // fragment, not query: never sent to a server or logged
      const fragment = new URLSearchParams({
        access_token: session.access_token,
        expires_in: String(session.expires_in),
        ...(returnUrl ? { return_to: returnUrl } : {}),
      });
      response.redirect(`${frontendUrl}/auth/callback#${fragment.toString()}`);
    } catch (error) {
      this.fail(response, error);
    }
  }

  /** Back to the login page with the reason. */
  private fail(response: Response, error: unknown): void {
    const code = error instanceof OAuthError ? error.code : 'failed';
    const base = this.oauth.frontendUrl();
    response.setHeader('Cache-Control', 'no-store');
    if (!base) {
      response.status(404).json({ statusCode: 404, message: 'OAuth sign-in is not set up.' });
      return;
    }
    response.redirect(`${base}/login?oauthError=${code}`);
  }
}
