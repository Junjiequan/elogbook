import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { JwtUser } from '../interfaces/jwt-user.interface.js';

/** The signed-in person, as `@CurrentUser() user: JwtUser`. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): JwtUser =>
    context.switchToHttp().getRequest<Request & { user: JwtUser }>().user,
);
