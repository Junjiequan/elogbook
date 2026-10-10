import type { Provider } from '@angular/core';
import { ProposalRepository } from '../core/data-access/proposal.repository';
import type { Proposal } from '../core/models/proposal.models';

/** Fictional proposals for tests. */
export const TEST_PROPOSALS: Proposal[] = [
  {
    id: '2026-0412',
    title: 'Micelle structure under shear',
    instrument: 'LoKI',
    samples: [
      { id: 'S-0031', name: 'SDS 5 wt% in D2O', formula: 'C12H25NaO4S' },
      { id: 'S-0032', name: 'SDS 10 wt% in D2O', formula: 'C12H25NaO4S' },
      { id: 'S-0033', name: 'D2O solvent background', formula: 'D2O' },
      { id: 'S-0034', name: 'SDS 5 wt% + 100 mM NaCl in D2O', formula: 'C12H25NaO4S' },
    ],
  },
  {
    id: '2026-0377',
    title: 'Hydrogen uptake in Pd thin films',
    instrument: 'ESTIA',
    samples: [{ id: 'S-0102', name: 'Pd film 50 nm on Si', formula: 'Pd' }],
  },
  {
    id: '2026-0290',
    title: 'Battery cathode degradation',
    instrument: 'DREAM',
    samples: [
      { id: 'S-0207', name: 'NMC811 pristine' },
      { id: 'S-0208', name: 'NMC811 after 500 cycles' },
    ],
  },
];

/** Serves `TEST_PROPOSALS` instead of asking an API. */
export const provideTestProposals = (): Provider => ({
  provide: ProposalRepository,
  useValue: { list: () => Promise.resolve(TEST_PROPOSALS) },
});
