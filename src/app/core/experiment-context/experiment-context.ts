import { Injectable } from '@angular/core';

export interface Sample {
  id: string;
  name: string;
  formula?: string;
}

export interface Proposal {
  id: string;
  title: string;
  instrument: string;
  samples: Sample[];
}

/**
 * Source of proposal / sample metadata (proposal system, SciCat, control software).
 * The MVP ships static data; a backend-backed implementation replaces this class later.
 */
export abstract class ExperimentContext {
  abstract proposals(): Promise<Proposal[]>;
}

export const INSTRUMENTS = [
  'LoKI',
  'ODIN',
  'DREAM',
  'CSPEC',
  'BIFROST',
  'ESTIA',
  'FREIA',
  'SKADI',
  'NMX',
] as const;

@Injectable()
export class StaticExperimentContext extends ExperimentContext {
  private readonly data: Proposal[] = [
    {
      id: '2026-0412',
      title: 'Micelle structure under shear',
      instrument: 'LoKI',
      samples: [
        { id: 'S-0031', name: 'SDS 5 wt% in D2O', formula: 'C12H25NaO4S' },
        { id: 'S-0032', name: 'SDS 10 wt% in D2O', formula: 'C12H25NaO4S' },
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

  override async proposals(): Promise<Proposal[]> {
    return this.data;
  }
}
