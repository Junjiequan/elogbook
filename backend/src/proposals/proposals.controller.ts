import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Proposal } from './proposals.js';
import { ProposalsService } from './proposals.service.js';

@ApiTags('proposals')
@ApiBearerAuth()
@Controller('proposals')
export class ProposalsController {
  constructor(private readonly proposals: ProposalsService) {}

  /** Every proposal, for anyone signed in. */
  @Get()
  list(): Proposal[] {
    return this.proposals.list();
  }
}
