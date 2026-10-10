import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CaslModule } from '../casl/casl.module.js';
import { UsersModule } from '../users/users.module.js';
import { LogbookMember } from './entities/logbook-member.entity.js';
import { Logbook } from './entities/logbook.entity.js';
import { LogbooksController } from './logbooks.controller.js';
import { LogbooksService } from './logbooks.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Logbook, LogbookMember]), UsersModule, CaslModule],
  controllers: [LogbooksController],
  providers: [LogbooksService],
  exports: [LogbooksService],
})
export class LogbooksModule {}
