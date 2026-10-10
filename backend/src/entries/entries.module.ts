import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CaslModule } from '../casl/casl.module.js';
import { LogbooksModule } from '../logbooks/logbooks.module.js';
import { EntriesController } from './entries.controller.js';
import { EntriesService } from './entries.service.js';
import { EntryVersion } from './entities/entry-version.entity.js';
import { Entry } from './entities/entry.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Entry, EntryVersion]), LogbooksModule, CaslModule],
  controllers: [EntriesController],
  providers: [EntriesService],
  exports: [EntriesService],
})
export class EntriesModule {}
