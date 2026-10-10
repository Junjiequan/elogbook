import { SetMetadata } from '@nestjs/common';
import type { Role } from '../role.enum.js';

export const ROLES_KEY = 'roles';

/** Restricts a route to people holding at least one of the roles. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
