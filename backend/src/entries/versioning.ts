import type { EntryContent } from './entities/entry.entity.js';

/** An automatic version is taken at most this often per entry. */
export const AUTO_VERSION_INTERVAL_MS = 5 * 60 * 1000;

interface Snapshot {
  title: string;
  content: EntryContent;
}

/**
 * Whether saving the entry should also keep an automatic version: the last version is old enough and
 * the entry differs from it. Writing every few seconds of typing would bury the history in copies.
 */
export function autoVersionDue(
  latest: (Snapshot & { savedAt: Date }) | undefined,
  entry: Snapshot,
  now: Date,
): boolean {
  if (!latest) {
    return true;
  }
  const old = now.getTime() - latest.savedAt.getTime() >= AUTO_VERSION_INTERVAL_MS;
  const same =
    latest.title === entry.title &&
    JSON.stringify(latest.content) === JSON.stringify(entry.content);
  return old && !same;
}
