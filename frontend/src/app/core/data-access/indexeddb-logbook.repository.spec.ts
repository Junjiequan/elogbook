import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DEMO_USERS } from '../../../demo/demo-users';
import { PinLimitReachedError } from './logbook.repository';
import { MAX_PINNED_ENTRIES } from '../models/logbook.models';
import {
  AUTO_VERSION_INTERVAL_MS,
  IndexedDbLogbookRepository,
  LOGBOOK_DB_OPTIONS,
} from './indexeddb-logbook.repository';

const [anna, jon] = DEMO_USERS;
const doc = (text: string) => ({
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
});

describe('IndexedDbLogbookRepository', () => {
  let repo: IndexedDbLogbookRepository;
  let dbName: string;

  beforeEach(() => {
    dbName = `elogbook-test-${crypto.randomUUID()}`;
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        IndexedDbLogbookRepository,
        { provide: LOGBOOK_DB_OPTIONS, useValue: { name: dbName } },
      ],
    });
    repo = TestBed.inject(IndexedDbLogbookRepository);
  });

  afterEach(() => indexedDB.deleteDatabase(dbName));

  async function newEntry() {
    const logbook = await repo.createLogbook(
      { title: 'L', description: '', instrument: null, proposalId: null },
      anna,
    );
    return repo.createEntry(logbook.id, anna);
  }

  it('lists only logbooks the user may read', async () => {
    const logbook = await repo.createLogbook(
      { title: 'L', description: '', instrument: null, proposalId: null },
      anna,
    );
    expect((await repo.listLogbooks(anna)).map((l) => l.id)).toEqual([logbook.id]);
    expect(await repo.listLogbooks(jon)).toEqual([]);

    await repo.updateLogbook(logbook.id, {
      members: [...logbook.members, { user: jon, role: 'viewer' }],
    });
    expect((await repo.listLogbooks(jon)).length).toBe(1);
  });

  it('saves changes and bumps the revision', async () => {
    const entry = await newEntry();
    const saved = await repo.saveEntry(entry.id, { title: 'Run 1', content: doc('hello') }, jon);

    expect(saved.revision).toBe(entry.revision + 1);
    expect(saved.updatedBy.id).toBe(jon.id);
    expect((await repo.getEntry(entry.id))?.title).toBe('Run 1');
  });

  it('takes an automatic version on first save, then not again within the interval', async () => {
    const entry = await newEntry();
    await repo.saveEntry(entry.id, { content: doc('one') }, anna);
    await repo.saveEntry(entry.id, { content: doc('two') }, anna);

    expect((await repo.listVersions(entry.id)).length).toBe(1);
  });

  it('takes another automatic version once the interval has passed', async () => {
    const entry = await newEntry();
    const clock = jasmine.clock();
    clock.install();
    clock.mockDate(new Date());
    await repo.saveEntry(entry.id, { content: doc('one') }, anna);
    clock.mockDate(new Date(Date.now() + AUTO_VERSION_INTERVAL_MS + 1000));
    await repo.saveEntry(entry.id, { content: doc('two') }, anna);
    jasmine.clock().uninstall();

    expect((await repo.listVersions(entry.id)).length).toBe(2);
  });

  it('restores an old version and keeps the replaced text in the history', async () => {
    const entry = await newEntry();
    await repo.saveEntry(entry.id, { title: 'v1', content: doc('first') }, anna);
    const [first] = await repo.listVersions(entry.id);
    await repo.saveEntry(entry.id, { title: 'v2', content: doc('second') }, anna);

    const restored = await repo.restoreVersion(entry.id, first.id, jon);

    expect(restored.title).toBe('v1');
    expect(restored.content).toEqual(doc('first'));
    const versions = await repo.listVersions(entry.id);
    const beforeRestore = versions.find((v) => v.reason === 'restore');
    expect(beforeRestore?.content).toEqual(doc('second'));
    expect(beforeRestore?.savedBy.id).toBe(jon.id);
  });

  it('rejects restoring a version of another entry', async () => {
    const a = await newEntry();
    const b = await newEntry();
    await repo.saveEntry(a.id, { content: doc('a') }, anna);
    const [versionOfA] = await repo.listVersions(a.id);

    await expectAsync(repo.restoreVersion(b.id, versionOfA.id, anna)).toBeRejected();
  });

  it('deletes a logbook with its entries and version history, and nothing else', async () => {
    const keep = await newEntry();
    await repo.saveEntry(keep.id, { content: doc('keep me') }, anna);
    const gone = await repo.createLogbook(
      { title: 'Gone', description: '', instrument: null, proposalId: null },
      anna,
    );
    const goneEntry = await repo.createEntry(gone.id, anna);
    await repo.saveEntry(goneEntry.id, { content: doc('delete me') }, anna);
    expect((await repo.listVersions(goneEntry.id)).length).toBe(1);

    await repo.deleteLogbook(gone.id);

    expect((await repo.listLogbooks(anna)).map((l) => l.id)).not.toContain(gone.id);
    expect(await repo.getEntry(goneEntry.id)).toBeUndefined();
    expect(await repo.listVersions(goneEntry.id)).toEqual([]);
    expect(await repo.getEntry(keep.id)).toBeDefined();
    expect((await repo.listVersions(keep.id)).length).toBe(1);
  });

  it('deletes one entry with its versions and leaves the others alone', async () => {
    const logbook = await repo.createLogbook(
      { title: 'L', description: '', instrument: null, proposalId: null },
      anna,
    );
    const doomed = await repo.createEntry(logbook.id, anna);
    const kept = await repo.createEntry(logbook.id, anna);
    await repo.saveEntry(doomed.id, { content: doc('bye') }, anna);
    await repo.saveEntry(kept.id, { content: doc('stay') }, anna);

    await repo.deleteEntry(doomed.id);

    expect(await repo.getEntry(doomed.id)).toBeUndefined();
    expect(await repo.listVersions(doomed.id)).toEqual([]);
    expect((await repo.listEntries(logbook.id)).map((e) => e.id)).toEqual([kept.id]);
    expect((await repo.listVersions(kept.id)).length).toBe(1);
  });

  describe('pinned entries', () => {
    const makeLogbook = (owner = anna) =>
      repo.createLogbook(
        { title: 'L', description: '', instrument: 'LoKI', proposalId: null },
        owner,
      );
    const pause = () => new Promise((resolve) => setTimeout(resolve, 5));

    it('pins and unpins an entry, and remembers it', async () => {
      const logbook = await makeLogbook();
      const entry = await repo.createEntry(logbook.id, anna);
      expect(await repo.isEntryPinned(anna, entry.id)).toBeFalse();

      await repo.setEntryPinned(anna, entry.id, true);
      expect(await repo.isEntryPinned(anna, entry.id)).toBeTrue();

      await repo.setEntryPinned(anna, entry.id, false);
      expect(await repo.isEntryPinned(anna, entry.id)).toBeFalse();
    });

    it('lists the pinned entries in the order they were pinned, with where each one is', async () => {
      const first = await makeLogbook();
      const second = await makeLogbook();
      const a = await repo.createEntry(first.id, anna);
      const b = await repo.createEntry(second.id, anna);
      await repo.saveEntry(a.id, { title: 'First entry' }, anna);
      await repo.setEntryPinned(anna, a.id, true);
      await pause();
      await repo.setEntryPinned(anna, b.id, true);

      const pinned = await repo.listPinnedEntries(anna);

      expect(pinned.map((p) => p.entryId)).toEqual([a.id, b.id]);
      expect(pinned[0]).toEqual(
        jasmine.objectContaining({
          entryTitle: 'First entry',
          logbookId: first.id,
          instrument: 'LoKI',
          updatedAt: jasmine.any(String),
          updatedBy: anna,
        }),
      );
    });

    it('keeps pins personal: someone else’s pin on the same entry is not yours', async () => {
      const logbook = await makeLogbook();
      await repo.updateLogbook(logbook.id, {
        members: [
          { user: anna, role: 'owner' },
          { user: jon, role: 'viewer' },
        ],
      });
      const entry = await repo.createEntry(logbook.id, anna);

      await repo.setEntryPinned(jon, entry.id, true);

      expect(await repo.isEntryPinned(jon, entry.id)).toBeTrue();
      expect(await repo.isEntryPinned(anna, entry.id)).toBeFalse();
      expect(await repo.listPinnedEntries(anna)).toEqual([]);
    });

    const pinMany = async (logbookId: string, count: number) => {
      const ids: string[] = [];
      for (let i = 0; i < count; i++) {
        const entry = await repo.createEntry(logbookId, anna);
        await repo.setEntryPinned(anna, entry.id, true);
        ids.push(entry.id);
      }
      return ids;
    };

    it('allows up to the limit of pins, and refuses one more', async () => {
      const logbook = await makeLogbook();
      await pinMany(logbook.id, MAX_PINNED_ENTRIES);
      const extra = await repo.createEntry(logbook.id, anna);

      await expectAsync(repo.setEntryPinned(anna, extra.id, true)).toBeRejectedWithError(
        PinLimitReachedError,
      );
      expect(await repo.isEntryPinned(anna, extra.id)).toBeFalse();
      expect((await repo.listPinnedEntries(anna)).length).toBe(MAX_PINNED_ENTRIES);
    });

    it('lets you pin again after unpinning one, and counts each person’s pins on their own', async () => {
      const logbook = await makeLogbook();
      await repo.updateLogbook(logbook.id, {
        members: [
          { user: anna, role: 'owner' },
          { user: jon, role: 'viewer' },
        ],
      });
      const [first] = await pinMany(logbook.id, MAX_PINNED_ENTRIES);
      const extra = await repo.createEntry(logbook.id, anna);

      await repo.setEntryPinned(jon, extra.id, true); // someone else's pins do not count against you
      await repo.setEntryPinned(anna, first, false);
      await repo.setEntryPinned(anna, extra.id, true);

      expect(await repo.isEntryPinned(anna, extra.id)).toBeTrue();
    });

    it('does not count pinning an entry that is already pinned', async () => {
      const logbook = await makeLogbook();
      const [first] = await pinMany(logbook.id, MAX_PINNED_ENTRIES);

      await expectAsync(repo.setEntryPinned(anna, first, true)).toBeResolved();
    });

    it('keeps the order the person arranges, and puts a new pin last', async () => {
      const logbook = await makeLogbook();
      const [a, b, c] = await pinMany(logbook.id, 3);

      await repo.reorderPinnedEntries(anna, [c, a, b]);
      expect((await repo.listPinnedEntries(anna)).map((p) => p.entryId)).toEqual([c, a, b]);

      const d = (await pinMany(logbook.id, 1))[0];
      expect((await repo.listPinnedEntries(anna)).map((p) => p.entryId)).toEqual([c, a, b, d]);
    });

    it('orders only the person’s own pins', async () => {
      const logbook = await makeLogbook();
      await repo.updateLogbook(logbook.id, {
        members: [
          { user: anna, role: 'owner' },
          { user: jon, role: 'viewer' },
        ],
      });
      const [a, b] = await pinMany(logbook.id, 2);
      await repo.setEntryPinned(jon, a, true);
      await repo.setEntryPinned(jon, b, true);

      await repo.reorderPinnedEntries(anna, [b, a]);

      expect((await repo.listPinnedEntries(anna)).map((p) => p.entryId)).toEqual([b, a]);
      expect((await repo.listPinnedEntries(jon)).map((p) => p.entryId)).toEqual([a, b]);
    });

    it('pinning twice makes one pin', async () => {
      const logbook = await makeLogbook();
      const entry = await repo.createEntry(logbook.id, anna);

      await repo.setEntryPinned(anna, entry.id, true);
      await repo.setEntryPinned(anna, entry.id, true);

      expect((await repo.listPinnedEntries(anna)).length).toBe(1);
    });

    it('drops a pin on an entry the person may no longer read', async () => {
      const logbook = await makeLogbook();
      await repo.updateLogbook(logbook.id, {
        members: [
          { user: anna, role: 'owner' },
          { user: jon, role: 'viewer' },
        ],
      });
      const entry = await repo.createEntry(logbook.id, anna);
      await repo.setEntryPinned(jon, entry.id, true);

      await repo.updateLogbook(logbook.id, { members: [{ user: anna, role: 'owner' }] });

      expect(await repo.listPinnedEntries(jon)).toEqual([]);
    });

    it('removes everyone’s pins when the entry or its logbook is deleted', async () => {
      const logbook = await makeLogbook();
      const gone = await repo.createEntry(logbook.id, anna);
      const doomed = await makeLogbook();
      const other = await repo.createEntry(doomed.id, anna);
      await repo.setEntryPinned(anna, gone.id, true);
      await repo.setEntryPinned(anna, other.id, true);

      await repo.deleteEntry(gone.id);
      await repo.deleteLogbook(doomed.id);

      expect(await repo.isEntryPinned(anna, gone.id)).toBeFalse();
      expect(await repo.isEntryPinned(anna, other.id)).toBeFalse();
      expect(await repo.listPinnedEntries(anna)).toEqual([]);
    });
  });
});
