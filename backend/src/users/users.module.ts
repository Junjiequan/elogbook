import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserIdentity } from './entities/user-identity.entity.js';
import { User } from './entities/user.entity.js';
import { LocalAccountsService } from './local-accounts.service.js';
import { UsersService } from './users.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([User, UserIdentity])],
  providers: [UsersService, LocalAccountsService],
  exports: [UsersService],
})
export class UsersModule {}
