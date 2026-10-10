import type { Logbook, MemberRole } from '../../core/models/logbook.models';

/**
 * What the logbook list can be narrowed and ordered by.
 *
 * Each filter and each sort is one entry in a list below, and the toolbar is drawn from those
 * lists. To add a filter (a proposal, who owns it, private or facility-wide…) or a sort, add an
 * entry here; nothing in the list page or its template changes. The chosen values are plain
 * strings (`{ role: 'owner', instrument: 'LoKI' }`), which is also what a backend query takes.
 */

/** What a filter may need to know about the person looking. */
export interface FilterContext {
  roleOf: (logbook: Logbook) => MemberRole | '';
}

export interface FilterOption {
  value: string;
  label: string;
  /** How many of the person's logbooks it would show. */
  count: number;
}

export interface LogbookFilter {
  /** Stable name: the key of the chosen value, and later of a query parameter. */
  id: string;
  /** "Instrument": names the filter in menus and summaries. */
  label: string;
  icon: string;
  /** `segmented`: always visible side by side, for a few options. `menu`: behind a button, for any number. */
  display: 'segmented' | 'menu';
  /** What "no filter" is called: "All", "All instruments". */
  allLabel: string;
  options: (logbooks: readonly Logbook[], context: FilterContext) => FilterOption[];
  matches: (logbook: Logbook, value: string, context: FilterContext) => boolean;
}

const ROLES: { value: MemberRole; label: string }[] = [
  { value: 'owner', label: 'Owned by me' },
  { value: 'editor', label: 'I can edit' },
  { value: 'viewer', label: 'View only' },
];

export const ROLE_FILTER: LogbookFilter = {
  id: 'role',
  label: 'Your role',
  icon: 'person',
  display: 'segmented',
  allLabel: 'All',
  options: (logbooks, { roleOf }) =>
    ROLES.map(({ value, label }) => ({
      value,
      label,
      count: logbooks.filter((l) => roleOf(l) === value).length,
    })),
  matches: (logbook, value, { roleOf }) => roleOf(logbook) === value,
};

export const INSTRUMENT_FILTER: LogbookFilter = {
  id: 'instrument',
  label: 'Instrument',
  icon: 'sensors',
  display: 'menu',
  allLabel: 'All instruments',
  // Only the instruments the person's logbooks actually use.
  options: (logbooks) => {
    const counts = new Map<string, number>();
    for (const { instrument } of logbooks) {
      if (instrument) {
        counts.set(instrument, (counts.get(instrument) ?? 0) + 1);
      }
    }
    return [...counts.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([value, count]) => ({ value, label: value, count }));
  },
  matches: (logbook, value) => logbook.instrument === value,
};

/** In the order the toolbar shows them. */
export const FILTERS: readonly LogbookFilter[] = [ROLE_FILTER, INSTRUMENT_FILTER];

export interface LogbookSort {
  key: string;
  label: string;
  compare: (a: Logbook, b: Logbook) => number;
}

const byTitle = (a: Logbook, b: Logbook) =>
  a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });

/** The first is the default. Equal dates keep the order they came in (the sort is stable). */
export const SORTS: readonly LogbookSort[] = [
  {
    key: 'updated',
    label: 'Recently updated',
    compare: (a, b) => b.updatedAt.localeCompare(a.updatedAt),
  },
  {
    key: 'created',
    label: 'Recently created',
    compare: (a, b) => b.createdAt.localeCompare(a.createdAt),
  },
  { key: 'title', label: 'Title (A–Z)', compare: byTitle },
  {
    key: 'instrument',
    label: 'Instrument',
    // Logbooks without an instrument go last.
    compare: (a, b) =>
      !a.instrument !== !b.instrument
        ? a.instrument
          ? -1
          : 1
        : (a.instrument ?? '').localeCompare(b.instrument ?? '') || byTitle(a, b),
  },
];

export const DEFAULT_SORT = SORTS[0].key;
