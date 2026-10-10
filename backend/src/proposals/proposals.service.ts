import { existsSync, readFileSync } from 'node:fs';
import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppConfig } from '../config/configuration.js';
import { type Proposal, parseProposals } from './proposals.js';

/**
 * The proposals (with their instrument and samples) the app offers when a logbook is made and when a sample
 * is inserted. They come from `config/proposals.json` until there is a proposal system to ask.
 */
@Injectable()
export class ProposalsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ProposalsService.name);
  private proposals: Proposal[] = [];

  constructor(private readonly config: ConfigService<AppConfig, true>) {}

  onApplicationBootstrap(): void {
    const { file, explicit } = this.config.get('proposals', { infer: true });
    if (!existsSync(file)) {
      if (explicit) {
        throw new Error(`PROPOSALS_FILE is set to ${file}, which does not exist.`);
      }
      return; // no file, no proposals
    }
    this.loadFrom(file);
    this.logger.log(`${this.proposals.length} proposals from ${file}.`);
  }

  loadFrom(file: string): void {
    let json: unknown;
    try {
      json = JSON.parse(readFileSync(file, 'utf8'));
    } catch (error) {
      throw new Error(
        `The proposals file ${file} cannot be read as JSON: ${(error as Error).message}`,
      );
    }
    this.proposals = parseProposals(json);
  }

  list(): Proposal[] {
    return this.proposals;
  }
}
