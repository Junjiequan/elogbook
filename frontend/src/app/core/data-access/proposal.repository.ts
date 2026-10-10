import type { Proposal } from '../models/proposal.models';

/**
 * Where the proposals (with their instrument and samples) come from: the proposal system, SciCat or
 * control software. Like `LogbookRepository` it is a port: the app talks to this class and one provider
 * line in `app.config.ts` decides where the data comes from: today the API (`HttpProposalRepository`), which
 * reads them from a file; later it can ask the proposal system.
 */
export abstract class ProposalRepository {
  abstract list(): Promise<Proposal[]>;
}
