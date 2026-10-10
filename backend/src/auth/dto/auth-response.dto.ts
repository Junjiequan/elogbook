import type { UserDto } from '../interfaces/jwt-user.interface.js';

export class AuthResponseDto {
  access_token: string;
  /** Seconds until the token stops working. */
  expires_in: number;
  user: UserDto;
  /** True when the person may delete any logbook they can open. */
  isAdmin: boolean;
}
