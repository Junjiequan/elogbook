import type {
  Entry,
  EntryChanges,
  EntryVersion,
  Logbook,
  LogbookBundle,
  LogbookSettingsPatch,
  NewLogbook,
  RecentEntry,
  User,
  VersionReason,
} from '../models/logbook.models';

/**
 * Persistence contract for the logbook.
 *
 * The MVP implements it on IndexedDB. When the NestJS backend exists, add an
 * `HttpLogbookRepository` and swap the provider in `app.config.ts`; nothing else changes.
 */
export abstract class LogbookRepository {
  abstract listLogbooks(user: User): Promise<Logbook[]>;
  abstract createLogbook(input: NewLogbook, owner: User): Promise<Logbook>;
  abstract updateLogbook(id: string, patch: LogbookSettingsPatch): Promise<Logbook>;
  /** Permanently removes a logbook together with its entries and version history. */
  abstract deleteLogbook(id: string): Promise<void>;
  /** Stores a complete logbook (entries and versions included) exactly as given. */
  abstract importLogbook(bundle: LogbookBundle): Promise<void>;

  abstract listEntries(logbookId: string): Promise<Entry[]>;
  abstract getEntry(id: string): Promise<Entry | undefined>;
  /** The entries most recently edited, newest first, across every logbook the user may read. */
  abstract listRecentEntries(user: User, limit: number): Promise<RecentEntry[]>;
  /** Permanently removes an entry together with its version history. */
  abstract deleteEntry(id: string): Promise<void>;
  abstract createEntry(logbookId: string, author: User): Promise<Entry>;
  /** Saves the entry and, when the auto-version interval has elapsed, snapshots a version. */
  abstract saveEntry(id: string, changes: EntryChanges, author: User): Promise<Entry>;

  abstract listVersions(entryId: string): Promise<EntryVersion[]>;
  abstract createVersion(
    entryId: string,
    author: User,
    reason: VersionReason,
  ): Promise<EntryVersion>;
  /** Snapshots the current state, then replaces the entry with the chosen version. */
  abstract restoreVersion(entryId: string, versionId: string, author: User): Promise<Entry>;
}
