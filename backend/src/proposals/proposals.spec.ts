import { parseProposals } from './proposals.js';

const proposal = (over: object = {}) => ({
  id: '2026-0001',
  title: 'A title',
  instrument: 'LoKI',
  samples: [
    { id: 'S-1', name: 'Sample', formula: 'H2O' },
    { id: 'S-2', name: 'No formula' },
  ],
  ...over,
});

describe('parseProposals', () => {
  it('accepts proposals, with and without a formula on a sample', () => {
    expect(parseProposals([proposal()])).toEqual([proposal()]);
  });

  it('accepts an empty list', () => {
    expect(parseProposals([])).toEqual([]);
  });

  it('wants a list', () => {
    expect(() => parseProposals({ id: 'x' })).toThrowError(/list of proposals/);
  });

  it('names every problem at once', () => {
    expect(() =>
      parseProposals([
        proposal({ id: 'A', title: '' }),
        proposal({ id: 'B', instrument: undefined }),
        proposal({ id: 'C', samples: [{ id: 'S-1' }] }),
      ]),
    ).toThrowError(/A: "title"[\s\S]*B: "instrument"[\s\S]*C: sample 1 needs/);
  });

  it('refuses a proposal listed twice', () => {
    expect(() => parseProposals([proposal(), proposal()])).toThrowError(/2026-0001: listed twice/);
  });
});
