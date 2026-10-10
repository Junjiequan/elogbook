import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module.js';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard.js';
import { RolesGuard } from './auth/guards/roles.guard.js';
import { type AppConfig, configuration } from './config/configuration.js';
import { validateEnv } from './config/env.validation.js';
import { dataSourceOptions } from './database/database.config.js';
import { EntriesModule } from './entries/entries.module.js';
import { HealthModule } from './health/health.module.js';
import { LogbooksModule } from './logbooks/logbooks.module.js';
import { PinsModule } from './pins/pins.module.js';
import { UsersModule } from './users/users.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration], validate: validateEnv }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>) =>
        dataSourceOptions(
          config.get('database.url', { infer: true }),
          config.get('database.migrate', { infer: true }),
        ),
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>) => [
        { ttl: 60_000, limit: config.get('rateLimit.default', { infer: true }) },
      ],
    }),
    AuthModule,
    UsersModule,
    LogbooksModule,
    EntriesModule,
    PinsModule,
    HealthModule,
  ],
  providers: [
    // In this order: too many requests are refused first, then a missing token, then a missing role.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
