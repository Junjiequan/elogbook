import type {
  Entry,
  EntryChanges,
  EntryVersion,
  Logbook,
  LogbookBundle,
  LogbookSettingsPatch,
  NewLogbook,
  PinnedEntry,
  User,
  VersionReason,
} from '../models/logbook.models';

/** Pinning was refused because the person already has `MAX_PINNED_ENTRIES` pins. */
export class PinLimitReachedError extends Error {
  constructor() {
    super('The limit of pinned entries has been reached.');
  }
}

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
  /**
   * The entries this person has pinned, in the order they arranged them (a new pin goes last).
   * Pins are personal: nobody else sees them. An entry the person may no longer read is left out.
   */
  abstract listPinnedEntries(user: User): Promise<PinnedEntry[]>;
  abstract isEntryPinned(user: User, entryId: string): Promise<boolean>;
  /** Pins or unpins. Pinning more than `MAX_PINNED_ENTRIES` throws `PinLimitReachedError`. */
  abstract setEntryPinned(user: User, entryId: string, pinned: boolean): Promise<void>;
  /** Stores the order of the person's pins: `entryIds` first to last. */
  abstract reorderPinnedEntries(user: User, entryIds: string[]): Promise<void>;
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
