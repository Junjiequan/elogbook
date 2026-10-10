import { type AppAbility, defineAbilityFor } from './ability.js';
import { Injectable } from '@nestjs/common';
import type { JwtUser } from '../auth/interfaces/jwt-user.interface.js';
import { Role } from '../auth/role.enum.js';

/**
 * Builds what a signed-in person may do. The rules themselves are in `@elogbook/permissions`, the same
 * package the Angular app uses, so the API and the screen cannot disagree; this only says who is asking.
 */
@Injectable()
export class CaslAbilityFactory {
  createForUser(user: JwtUser): AppAbility {
    return defineAbilityFor({ id: user.id, isAdmin: user.roles.includes(Role.Admin) });
  }
}
