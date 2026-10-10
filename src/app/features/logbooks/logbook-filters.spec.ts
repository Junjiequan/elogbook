import { DEMO_USERS } from '../../../demo/demo-users';
import type { Logbook } from '../../core/models/logbook.models';
import { DEFAULT_SORT, FILTERS, INSTRUMENT_FILTER, ROLE_FILTER, SORTS } from './logbook-filters';

const [anna, jon] = DEMO_USERS;

const book = (id: string, overrides: Partial<Logbook> = {}): Logbook => ({
  id,
  title: `Logbook ${id}`,
  description: '',
  instrument: null,
  proposalId: null,
  visibility: 'private',
  members: [{ user: anna, role: 'owner' }],
  createdAt: '2026-10-01T10:00:00Z',
  updatedAt: '2026-10-01T10:00:00Z',
  ...overrides,
});

describe('the role filter', () => {
  const context = {
    roleOf: (l: Logbook) => l.members.find((m) => m.user.id === anna.id)?.role ?? '',
  };
  const books = [
    book('1'),
    book('2', {
      members: [
        { user: jon, role: 'owner' },
        { user: anna, role: 'editor' },
      ],
    }),
    book('3', {
      members: [
        { user: jon, role: 'owner' },
        { user: anna, role: 'viewer' },
      ],
    }),
    book('4', {
      members: [
        { user: jon, role: 'owner' },
        { user: anna, role: 'viewer' },
      ],
    }),
  ];

  it('offers each role with how many logbooks it covers', () => {
    expect(ROLE_FILTER.options(books, context)).toEqual([
      { value: 'owner', label: 'Owned by me', count: 1 },
      { value: 'editor', label: 'I can edit', count: 1 },
      { value: 'viewer', label: 'View only', count: 2 },
    ]);
  });

  it('matches the logbooks where the person has that role', () => {
    const owned = books.filter((b) => ROLE_FILTER.matches(b, 'owner', context));
    expect(owned.map((b) => b.id)).toEqual(['1']);
  });

  it('is shown side by side, as it has only a few options', () => {
    expect(ROLE_FILTER.display).toBe('segmented');
  });
});

describe('the instrument filter', () => {
  const context = { roleOf: () => '' as const };
  const books = [
    book('1', { instrument: 'LoKI' }),
    book('2', { instrument: 'DREAM' }),
    book('3', { instrument: 'LoKI' }),
    book('4'),
  ];

  it('offers only the instruments in use, in alphabetical order, with their counts', () => {
    expect(INSTRUMENT_FILTER.options(books, context)).toEqual([
      { value: 'DREAM', label: 'DREAM', count: 1 },
      { value: 'LoKI', label: 'LoKI', count: 2 },
    ]);
  });

  it('matches by instrument', () => {
    expect(
      books.filter((b) => INSTRUMENT_FILTER.matches(b, 'LoKI', context)).map((b) => b.id),
    ).toEqual(['1', '3']);
  });

  it('sits behind a button, since there may be many instruments', () => {
    expect(INSTRUMENT_FILTER.display).toBe('menu');
  });
});

describe('the list of filters', () => {
  it('gives every filter its own id and a name for "no filter", so the toolbar can be drawn from it', () => {
    const ids = FILTERS.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const filter of FILTERS) {
      expect(filter.label).toBeTruthy();
      expect(filter.allLabel).toBeTruthy();
      expect(filter.icon).toBeTruthy();
    }
  });
});

describe('the sorts', () => {
  const sorted = (key: string, books: Logbook[]) =>
    [...books].sort(SORTS.find((s) => s.key === key)!.compare).map((b) => b.id);

  it('starts with the most recently updated', () => {
    expect(DEFAULT_SORT).toBe('updated');
    expect(
      sorted('updated', [
        book('old', { updatedAt: '2026-01-01T00:00:00Z' }),
        book('new', { updatedAt: '2026-09-01T00:00:00Z' }),
      ]),
    ).toEqual(['new', 'old']);
  });

  it('can put the most recently created first', () => {
    expect(
      sorted('created', [
        book('a', { createdAt: '2026-01-01T00:00:00Z' }),
        book('b', { createdAt: '2026-05-01T00:00:00Z' }),
      ]),
    ).toEqual(['b', 'a']);
  });

  it('orders titles A to Z, ignoring case', () => {
    expect(
      sorted('title', [
        book('1', { title: 'zebra' }),
        book('2', { title: 'Apple' }),
        book('3', { title: 'mango' }),
      ]),
    ).toEqual(['2', '3', '1']);
  });

  it('orders by instrument, with logbooks that have none last, then by title', () => {
    expect(
      sorted('instrument', [
        book('none'),
        book('b', { instrument: 'LoKI', title: 'B' }),
        book('a', { instrument: 'LoKI', title: 'A' }),
        book('d', { instrument: 'DREAM' }),
      ]),
    ).toEqual(['d', 'a', 'b', 'none']);
  });

  it('keeps the incoming order when dates are equal', () => {
    expect(sorted('updated', [book('x'), book('y'), book('z')])).toEqual(['x', 'y', 'z']);
  });
});
