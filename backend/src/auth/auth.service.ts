import { ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { AppConfig } from '../config/configuration.js';
import type { User } from '../users/entities/user.entity.js';
import { toUserDto } from '../users/user-dto.js';
import { UsersService } from '../users/users.service.js';
import type { AuthResponseDto } from './dto/auth-response.dto.js';
import type { RegisterDto } from './dto/register.dto.js';
import { Role } from './role.enum.js';
import { hashPassword, verifyPassword } from './utils/password.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  /** The account when the password is right; `null` for a wrong password, an unknown email or an invited account. */
  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.users.findForLogin(email);
    const ok = await verifyPassword(password, user?.passwordHash ?? null);
    if (!user || !ok) {
      return null;
    }
    const { passwordHash: _hash, ...safe } = user;
    return safe as User;
  }

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    if (!this.config.get('auth.allowRegistration', { infer: true })) {
      throw new ForbiddenException('Creating an account is turned off. Sign in instead.');
    }
    const user = await this.users.register(dto.name, dto.email, await hashPassword(dto.password));
    return this.login(user);
  }

  async login(user: User): Promise<AuthResponseDto> {
    const expiresIn = this.config.get('jwt.expiresIn', { infer: true });
    return {
      access_token: this.jwt.sign({ sub: user.id }, { expiresIn }),
      expires_in: expiresIn,
      user: toUserDto(user),
      isAdmin: this.isAdmin(user),
    };
  }

  isAdmin(user: Pick<User, 'email' | 'roles'>): boolean {
    return (
      user.roles.includes(Role.Admin) ||
      this.config.get('auth.adminEmails', { infer: true }).includes(user.email)
    );
  }
}
