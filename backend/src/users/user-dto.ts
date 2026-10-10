import type { UserDto } from '../auth/interfaces/jwt-user.interface.js';
import type { User } from './entities/user.entity.js';

/** The public face of a person in an API response: no password hash, no roles. */
export const toUserDto = (user: Pick<User, 'id' | 'name' | 'email'>): UserDto => ({
  id: user.id,
  name: user.name,
  email: user.email,
});
