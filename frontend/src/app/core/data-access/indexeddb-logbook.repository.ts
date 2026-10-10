import { Injectable, InjectionToken, inject } from '@angular/core';
import { type DBSchema, type IDBPDatabase, type IDBPObjectStore, openDB } from 'idb';
import { LogbookRepository, PinLimitReachedError } from './logbook.repository';
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
import { canRead } from '../auth/permissions';
import { MAX_PINNED_ENTRIES } from '../models/logbook.models';

export interface LogbookDbOptions {
  name: string;
}

export const LOGBOOK_DB_OPTIONS = new InjectionToken<LogbookDbOptions>('LOGBOOK_DB_OPTIONS', {
  factory: () => ({ name: 'elogbook' }),
});

/** An automatic version is taken at most this often per entry. */
export const AUTO_VERSION_INTERVAL_MS = 5 * 60 * 1000;

interface LogbookDb extends DBSchema {
  logbooks: { key: string; value: Logbook };
  entries: { key: string; value: Entry; indexes: { byLogbook: string } };
  versions: { key: string; value: EntryVersion; indexes: { byEntry: string } };
  pins: { key: string; value: Pin; indexes: { byUser: string; byEntry: string } };
}

/** One person's pin on one entry. The key is both ids, so pinning twice cannot make two. */
interface Pin {
  key: string;
  userId: string;
  entryId: string;
  pinnedAt: string;
  /** Place in the person's own order (0 is first). Pins made before ordering existed have none. */
  position?: number;
}

const pinKey = (user: User, entryId: string) => `${user.id}|${entryId}`;

@Injectable()
export class IndexedDbLogbookRepository extends LogbookRepository {
  private readonly options = inject(LOGBOOK_DB_OPTIONS);
  private dbPromise?: Promise<IDBPDatabase<LogbookDb>>;

  override async listLogbooks(user: User): Promise<Logbook[]> {
    const db = await this.db();
    const all = await db.getAll('logbooks');
    return all.filter((l) => canRead(l, user)).sort(byUpdatedDesc);
  }

  override async createLogbook(input: NewLogbook, owner: User): Promise<Logbook> {
    const now = new Date().toISOString();
    const logbook: Logbook = {
      ...input,
      id: crypto.randomUUID(),
      visibility: 'private',
      members: [{ user: owner, role: 'owner' }],
      createdAt: now,
      updatedAt: now,
    };
    await (await this.db()).put('logbooks', logbook);
    return logbook;
  }

  override async updateLogbook(id: string, patch: LogbookSettingsPatch): Promise<Logbook> {
    const db = await this.db();
    const existing = await db.get('logbooks', id);
    if (!existing) {
      throw new Error(`Logbook ${id} not found`);
    }
    const updated: Logbook = { ...existing, ...patch, updatedAt: new Date().toISOString() };
    await db.put('logbooks', updated);
    return updated;
  }

  override async deleteLogbook(id: string): Promise<void> {
    const db = await this.db();
    const tx = db.transaction(['logbooks', 'entries', 'versions', 'pins'], 'readwrite');
    const entryIds = await tx.objectStore('entries').index('byLogbook').getAllKeys(id);
    for (const entryId of entryIds) {
      await deletePins(tx.objectStore('pins'), entryId);
      const versionIds = await tx.objectStore('versions').index('byEntry').getAllKeys(entryId);
      await Promise.all(
        versionIds.map((versionId) => tx.objectStore('versions').delete(versionId)),
      );
      await tx.objectStore('entries').delete(entryId);
    }
    await tx.objectStore('logbooks').delete(id);
    await tx.done;
  }

  override async importLogbook(bundle: LogbookBundle): Promise<void> {
    const db = await this.db();
    const tx = db.transaction(['logbooks', 'entries', 'versions'], 'readwrite');
    await Promise.all([
      tx.objectStore('logbooks').put(bundle.logbook),
      ...bundle.entries.map((entry) => tx.objectStore('entries').put(entry)),
      ...bundle.versions.map((version) => tx.objectStore('versions').put(version)),
      tx.done,
    ]);
  }

  override async listEntries(logbookId: string): Promise<Entry[]> {
    const entries = await (await this.db()).getAllFromIndex('entries', 'byLogbook', logbookId);
    return entries.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  override async listPinnedEntries(user: User): Promise<PinnedEntry[]> {
    const db = await this.db();
    const pins = inOrder(await db.getAllFromIndex('pins', 'byUser', user.id));
    const pinned: PinnedEntry[] = [];
    for (const pin of pins) {
      const entry = await db.get('entries', pin.entryId);
      const logbook = entry && (await db.get('logbooks', entry.logbookId));
      if (entry && logbook && canRead(logbook, user)) {
        pinned.push({
          entryId: entry.id,
          entryTitle: entry.title,
          logbookId: logbook.id,
          logbookTitle: logbook.title,
          instrument: logbook.instrument,
          pinnedAt: pin.pinnedAt,
          updatedAt: entry.updatedAt,
          updatedBy: entry.updatedBy,
        });
      }
    }
    return pinned;
  }

  override async isEntryPinned(user: User, entryId: string): Promise<boolean> {
    return !!(await (await this.db()).get('pins', pinKey(user, entryId)));
  }

  override async setEntryPinned(user: User, entryId: string, pinned: boolean): Promise<void> {
    const db = await this.db();
    if (!pinned) {
      await db.delete('pins', pinKey(user, entryId));
    } else if (!(await db.get('pins', pinKey(user, entryId)))) {
      const mine = await db.getAllFromIndex('pins', 'byUser', user.id);
      if (mine.length >= MAX_PINNED_ENTRIES) {
        throw new PinLimitReachedError();
      }
      // Number the existing pins first (older ones have no place yet), so the new one is surely last.
      const ordered = inOrder(mine);
      for (const [position, pin] of ordered.entries()) {
        await db.put('pins', { ...pin, position });
      }
      await db.put('pins', {
        key: pinKey(user, entryId),
        userId: user.id,
        entryId,
        pinnedAt: new Date().toISOString(),
        position: ordered.length,
      });
    }
  }

  override async reorderPinnedEntries(user: User, entryIds: string[]): Promise<void> {
    const db = await this.db();
    const tx = db.transaction('pins', 'readwrite');
    for (const [position, entryId] of entryIds.entries()) {
      const pin = await tx.store.get(pinKey(user, entryId));
      if (pin) {
        await tx.store.put({ ...pin, position });
      }
    }
    await tx.done;
  }

  override async getEntry(id: string): Promise<Entry | undefined> {
    return (await this.db()).get('entries', id);
  }

  override async deleteEntry(id: string): Promise<void> {
    const db = await this.db();
    const tx = db.transaction(['entries', 'versions', 'pins'], 'readwrite');
    await deletePins(tx.objectStore('pins'), id);
    const versionIds = await tx.objectStore('versions').index('byEntry').getAllKeys(id);
    await Promise.all(versionIds.map((versionId) => tx.objectStore('versions').delete(versionId)));
    await tx.objectStore('entries').delete(id);
    await tx.done;
  }

  override async createEntry(logbookId: string, author: User): Promise<Entry> {
    const now = new Date().toISOString();
    const entry: Entry = {
      id: crypto.randomUUID(),
      logbookId,
      title: '',
      content: { type: 'doc', content: [{ type: 'paragraph' }] },
      revision: 1,
      createdAt: now,
      updatedAt: now,
      updatedBy: author,
    };
    await (await this.db()).put('entries', entry);
    return entry;
  }

  override async saveEntry(id: string, changes: EntryChanges, author: User): Promise<Entry> {
    const db = await this.db();
    const existing = await db.get('entries', id);
    if (!existing) {
      throw new Error(`Entry ${id} not found`);
    }
    const now = new Date();
    const updated: Entry = {
      ...existing,
      ...changes,
      revision: existing.revision + 1,
      updatedAt: now.toISOString(),
      updatedBy: author,
    };
    await db.put('entries', updated);

    const versions = await db.getAllFromIndex('versions', 'byEntry', id);
    const latest = latestOf(versions);
    const due = !latest || now.getTime() - Date.parse(latest.savedAt) >= AUTO_VERSION_INTERVAL_MS;
    if (due && !sameContent(latest, updated)) {
      await db.put('versions', toVersion(updated, author, 'auto'));
    }
    return updated;
  }

  override async listVersions(entryId: string): Promise<EntryVersion[]> {
    const versions = await (await this.db()).getAllFromIndex('versions', 'byEntry', entryId);
    return versions.sort((a, b) => b.savedAt.localeCompare(a.savedAt));
  }

  override async createVersion(
    entryId: string,
    author: User,
    reason: VersionReason,
  ): Promise<EntryVersion> {
    const db = await this.db();
    const entry = await db.get('entries', entryId);
    if (!entry) {
      throw new Error(`Entry ${entryId} not found`);
    }
    const version = toVersion(entry, author, reason);
    await db.put('versions', version);
    return version;
  }

  override async restoreVersion(entryId: string, versionId: string, author: User): Promise<Entry> {
    const db = await this.db();
    const version = await db.get('versions', versionId);
    if (!version || version.entryId !== entryId) {
      throw new Error(`Version ${versionId} not found for entry ${entryId}`);
    }
    // Keep what is being replaced, so a restore can itself be undone.
    await this.createVersion(entryId, author, 'restore');
    return this.saveEntry(entryId, { title: version.title, content: version.content }, author);
  }

  private db(): Promise<IDBPDatabase<LogbookDb>> {
    this.dbPromise ??= this.open();
    return this.dbPromise;
  }

  private async open(): Promise<IDBPDatabase<LogbookDb>> {
    return openDB<LogbookDb>(this.options.name, 2, {
      upgrade(database, oldVersion) {
        if (oldVersion < 1) {
          database.createObjectStore('logbooks', { keyPath: 'id' });
          database
            .createObjectStore('entries', { keyPath: 'id' })
            .createIndex('byLogbook', 'logbookId');
          database
            .createObjectStore('versions', { keyPath: 'id' })
            .createIndex('byEntry', 'entryId');
        }
        if (oldVersion < 2) {
          const pins = database.createObjectStore('pins', { keyPath: 'key' });
          pins.createIndex('byUser', 'userId');
          pins.createIndex('byEntry', 'entryId');
        }
      },
    });
  }
}

/** A person's pins in their own order; older pins without a place keep the order they were made in. */
const inOrder = (pins: Pin[]): Pin[] =>
  [...pins].sort(
    (a, b) =>
      (a.position ?? Number.MAX_SAFE_INTEGER) - (b.position ?? Number.MAX_SAFE_INTEGER) ||
      a.pinnedAt.localeCompare(b.pinnedAt),
  );

/** Removes everyone's pins on an entry that is going away. */
async function deletePins(
  store: IDBPObjectStore<
    LogbookDb,
    ['logbooks', 'entries', 'versions', 'pins'] | ['entries', 'versions', 'pins'],
    'pins',
    'readwrite'
  >,
  entryId: string,
): Promise<void> {
  const keys = await store.index('byEntry').getAllKeys(entryId);
  await Promise.all(keys.map((key) => store.delete(key)));
}

const byUpdatedDesc = (a: Logbook, b: Logbook) => b.updatedAt.localeCompare(a.updatedAt);

const latestOf = (versions: EntryVersion[]): EntryVersion | undefined =>
  versions.reduce<EntryVersion | undefined>(
    (a, b) => (!a || b.savedAt > a.savedAt ? b : a),
    undefined,
  );

const sameContent = (version: EntryVersion | undefined, entry: Entry): boolean =>
  !!version &&
  version.title === entry.title &&
  JSON.stringify(version.content) === JSON.stringify(entry.content);

const toVersion = (entry: Entry, author: User, reason: VersionReason): EntryVersion => ({
  id: crypto.randomUUID(),
  entryId: entry.id,
  title: entry.title,
  content: entry.content,
  savedAt: new Date().toISOString(),
  savedBy: author,
  reason,
});
