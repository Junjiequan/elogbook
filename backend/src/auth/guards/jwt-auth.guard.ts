import { type ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';

/**
 * Registered for the whole app: a route without a valid token is refused unless it is marked `@Public()`.
 * (SciCat's guard lets a missing token through and relies on each route to check; denying by default
 * means a forgotten check can never expose data.)
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  override canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    return isPublic ? true : super.canActivate(context);
  }

  override handleRequest<T>(error: unknown, user: T, info?: { name?: string }): T {
    if (error || !user) {
      throw new UnauthorizedException(
        info?.name === 'TokenExpiredError' ? 'SESSION_EXPIRED' : undefined,
      );
    }
    return user;
  }
}
