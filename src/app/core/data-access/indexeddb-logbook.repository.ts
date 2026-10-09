import { Injectable, InjectionToken, inject } from '@angular/core';
import { type DBSchema, type IDBPDatabase, openDB } from 'idb';
import { createDemoData } from './demo-data';
import { LogbookRepository } from './logbook.repository';
import type {
  Entry,
  EntryChanges,
  EntryVersion,
  Logbook,
  LogbookSettingsPatch,
  NewLogbook,
  User,
  VersionReason,
} from '../models/logbook.models';
import { canRead } from '../auth/permissions';

export interface LogbookDbOptions {
  name: string;
  /** Insert demo content the first time the database is created. */
  seed: boolean;
}

export const LOGBOOK_DB_OPTIONS = new InjectionToken<LogbookDbOptions>('LOGBOOK_DB_OPTIONS', {
  factory: () => ({ name: 'elogbook', seed: true }),
});

/** An automatic version is taken at most this often per entry. */
export const AUTO_VERSION_INTERVAL_MS = 5 * 60 * 1000;

interface LogbookDb extends DBSchema {
  logbooks: { key: string; value: Logbook };
  entries: { key: string; value: Entry; indexes: { byLogbook: string } };
  versions: { key: string; value: EntryVersion; indexes: { byEntry: string } };
}

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

  override async listEntries(logbookId: string): Promise<Entry[]> {
    const entries = await (await this.db()).getAllFromIndex('entries', 'byLogbook', logbookId);
    return entries.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  override async getEntry(id: string): Promise<Entry | undefined> {
    return (await this.db()).get('entries', id);
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
    const { name, seed } = this.options;
    let created = false;
    const db = await openDB<LogbookDb>(name, 1, {
      upgrade(database) {
        created = true;
        database.createObjectStore('logbooks', { keyPath: 'id' });
        database
          .createObjectStore('entries', { keyPath: 'id' })
          .createIndex('byLogbook', 'logbookId');
        database.createObjectStore('versions', { keyPath: 'id' }).createIndex('byEntry', 'entryId');
      },
    });
    if (created && seed) {
      const data = createDemoData();
      const tx = db.transaction(['logbooks', 'entries'], 'readwrite');
      await Promise.all([
        ...data.logbooks.map((l) => tx.objectStore('logbooks').put(l)),
        ...data.entries.map((e) => tx.objectStore('entries').put(e)),
        tx.done,
      ]);
    }
    return db;
  }
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
