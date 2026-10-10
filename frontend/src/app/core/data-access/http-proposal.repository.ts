import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AppConfig } from '../api/app-config';
import type { Proposal } from '../models/proposal.models';
import { ProposalRepository } from './proposal.repository';

/** The proposals (with their instrument and samples) as the API serves them: it reads them from its config folder. */
@Injectable()
export class HttpProposalRepository extends ProposalRepository {
  private readonly http = inject(HttpClient);
  private readonly config = inject(AppConfig);

  list(): Promise<Proposal[]> {
    return firstValueFrom(this.http.get<Proposal[]>(`${this.config.apiUrl}/proposals`));
  }
}
