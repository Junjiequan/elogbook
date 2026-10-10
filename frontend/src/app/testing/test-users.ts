import type { User } from '../core/models/logbook.models';

/** Fictional people for tests. */
export const TEST_USERS: readonly User[] = [
  { id: 'anna.lindqvist@example.org', name: 'Anna Lindqvist', email: 'anna.lindqvist@example.org' },
  { id: 'jon.carter@example.org', name: 'Jon Carter', email: 'jon.carter@example.org' },
  { id: 'mei.tanaka@example.org', name: 'Mei Tanaka', email: 'mei.tanaka@example.org' },
];
