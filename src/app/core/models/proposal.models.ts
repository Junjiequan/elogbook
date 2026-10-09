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
