import type {
  Entry,
  EntryChanges,
  EntryVersion,
  Logbook,
  LogbookSettingsPatch,
  NewLogbook,
  PinnedEntry,
} from '../models/logbook.models';

/** Pinning was refused because the person already has `MAX_PINNED_ENTRIES` pins. */
export class PinLimitReachedError extends Error {
  constructor() {
    super('The limit of pinned entries has been reached.');
  }
}

/** Someone else saved the entry after it was opened here; saving now would overwrite their work. */
export class EntryConflictError extends Error {
  constructor(readonly currentRevision: number) {
    super('Someone else saved this entry after you opened it.');
  }
}

/**
 * Where logbooks, entries, versions and pins come from: the eLogbook API (`HttpLogbookRepository`).
 * The server knows who is asking, so nothing here takes a user.
 */
export abstract class LogbookRepository {
  /** The logbooks the person can open. */
  abstract listLogbooks(): Promise<Logbook[]>;
  abstract createLogbook(input: NewLogbook): Promise<Logbook>;
  abstract updateLogbook(id: string, patch: LogbookSettingsPatch): Promise<Logbook>;
  /** Permanently removes a logbook together with its entries and version history. */
  abstract deleteLogbook(id: string): Promise<void>;

  abstract listEntries(logbookId: string): Promise<Entry[]>;
  abstract getEntry(id: string): Promise<Entry | undefined>;
  abstract createEntry(logbookId: string): Promise<Entry>;
  /**
   * Saves the changes made on top of `revision`. If someone saved since, it throws
   * `EntryConflictError` instead of overwriting their work.
   */
  abstract saveEntry(id: string, changes: EntryChanges, revision: number): Promise<Entry>;
  /** Permanently removes an entry together with its version history. */
  abstract deleteEntry(id: string): Promise<void>;

  /** The person's pinned entries, in the order they arranged them. Pins are personal. */
  abstract listPinnedEntries(): Promise<PinnedEntry[]>;
  abstract isEntryPinned(entryId: string): Promise<boolean>;
  /** Pins or unpins. Pinning more than `MAX_PINNED_ENTRIES` throws `PinLimitReachedError`. */
  abstract setEntryPinned(entryId: string, pinned: boolean): Promise<void>;
  /** Stores the order of the person's pins: `entryIds` first to last. */
  abstract reorderPinnedEntries(entryIds: string[]): Promise<void>;

  abstract listVersions(entryId: string): Promise<EntryVersion[]>;
  /** Keeps the entry as it is now as a named point in its history. */
  abstract createVersion(entryId: string): Promise<EntryVersion>;
  /** Snapshots the current state, then replaces the entry with the chosen version. */
  abstract restoreVersion(entryId: string, versionId: string): Promise<Entry>;
}
