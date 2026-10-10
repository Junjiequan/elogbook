import { Body, Controller, Get, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import type { User } from '../users/entities/user.entity.js';
import { AuthService, toUserDto } from './auth.service.js';
import { CurrentUser } from './decorators/current-user.decorator.js';
import { Public } from './decorators/public.decorator.js';
import { AuthResponseDto } from './dto/auth-response.dto.js';
import { CredentialsDto } from './dto/credentials.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { LocalAuthGuard } from './guards/local-auth.guard.js';
import { Role } from './role.enum.js';
import type { JwtUser, UserDto } from './interfaces/jwt-user.interface.js';

// Sign-in and sign-up are the routes worth guessing at, so they get a much lower limit than the rest.
const authLimit = {
  default: { limit: () => Number(process.env.AUTH_RATE_LIMIT ?? 10), ttl: 60_000 },
};

@ApiTags('auth')
@ApiBearerAuth()
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle(authLimit)
  @UseGuards(LocalAuthGuard)
  @HttpCode(200)
  @ApiBody({ type: CredentialsDto })
  @Post('login')
  login(@Req() request: Request & { user: User }): AuthResponseDto {
    return this.authService.login(request.user);
  }

  @Public()
  @Throttle(authLimit)
  @Post('register')
  register(@Body() dto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(dto);
  }

  @Get('whoami')
  whoami(@CurrentUser() user: JwtUser): { user: UserDto; isAdmin: boolean } {
    return { user: toUserDto(user), isAdmin: user.roles.includes(Role.Admin) };
  }
}
