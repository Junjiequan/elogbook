import type { User } from './demo.types.js';

/** Fictional colleagues who appear in the demo logbooks. */
export const LOCAL_CONTACT: User = {
  id: 'sofia.reyes@example.org',
  name: 'Sofia Reyes',
  email: 'sofia.reyes@example.org',
};
export const REMOTE_COLLEAGUE: User = {
  id: 'marcus.webb@example.org',
  name: 'Marcus Webb',
  email: 'marcus.webb@example.org',
};
export const PRINCIPAL_INVESTIGATOR: User = {
  id: 'henrik.larsen@example.org',
  name: 'Henrik Larsen',
  email: 'henrik.larsen@example.org',
};

const person = (name: string): User => {
  const email = `${name
    .toLowerCase()
    .replace(/[^a-z ]/g, '')
    .replace(/\s+/g, '.')}@example.org`;
  return { id: email, name, email };
};

/** More fictional colleagues, so logbooks can have many members. */
export const TEAM = {
  priya: person('Priya Nair'),
  tomasz: person('Tomasz Kowalski'),
  elena: person('Elena Rossi'),
  kenji: person('Kenji Watanabe'),
  amara: person('Amara Okafor'),
  lars: person('Lars Nilsson'),
  chloe: person('Chloe Martin'),
  diego: person('Diego Fernandez'),
} as const;

/** A moment `daysAgo` days before `now`, at the given local time (never in the future). */
export function moment(now: Date, daysAgo: number, hours: number, minutes: number): Date {
  const date = new Date(now);
  date.setDate(date.getDate() - daysAgo);
  date.setHours(hours, minutes, 0, 0);
  return date > now ? new Date(now.getTime() - 20 * 60_000) : date;
}

export const later = (date: Date, minutes: number, now: Date): Date =>
  new Date(Math.min(date.getTime() + minutes * 60_000, now.getTime() - 60_000));

/** Short stable hash, so each user's copy of a demo logbook has a stable, unique id. */
function hashOf(text: string): string {
  let hash = 2166136261;
  for (const char of text) {
    hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/** Stable id per (demo logbook, user): seeding twice can never create a duplicate. */
export const demoLogbookId = (slug: string, user: User): string =>
  `demo-${slug}-${hashOf(user.id)}`;
