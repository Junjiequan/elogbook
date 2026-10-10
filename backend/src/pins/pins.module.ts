import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CaslModule } from '../casl/casl.module.js';
import { EntriesModule } from '../entries/entries.module.js';
import { PinnedEntry } from './entities/pinned-entry.entity.js';
import { PinsController } from './pins.controller.js';
import { PinsService } from './pins.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([PinnedEntry]), EntriesModule, CaslModule],
  controllers: [PinsController],
  providers: [PinsService],
})
export class PinsModule {}
