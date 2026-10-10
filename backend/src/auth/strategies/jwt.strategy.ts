import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { AppConfig } from '../../config/configuration.js';
import { UsersService } from '../../users/users.service.js';
import type { JwtUser } from '../interfaces/jwt-user.interface.js';
import { Role } from '../role.enum.js';

interface JwtPayload {
  sub: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly adminEmails: string[];

  constructor(
    config: ConfigService<AppConfig, true>,
    private readonly users: UsersService,
  ) {
    super({
      // Only the Authorization header: a token in the URL ends up in logs and browser history.
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get('jwt.secret', { infer: true }),
    });
    this.adminEmails = config.get('auth.adminEmails', { infer: true });
  }

  /** One lookup per request: a deleted person, or a changed role, takes effect at once. */
  async validate(payload: JwtPayload): Promise<JwtUser> {
    if (!payload.sub) {
      throw new UnauthorizedException(); // findOneBy({ id: undefined }) matches anybody
    }
    const user = await this.users.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException();
    }
    const roles = new Set(user.roles);
    if (this.adminEmails.includes(user.email)) {
      roles.add(Role.Admin);
    }
    return { id: user.id, email: user.email, name: user.name, roles: [...roles] };
  }
}
