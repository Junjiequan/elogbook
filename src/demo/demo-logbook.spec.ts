import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Editor, type JSONContent } from '@tiptap/core';
import { createEditorExtensions } from '../app/features/editor/extensions/editor-extensions';
import { roleOf } from '../app/core/auth/permissions';
import {
  IndexedDbLogbookRepository,
  LOGBOOK_DB_OPTIONS,
} from '../app/core/data-access/indexeddb-logbook.repository';
import { LogbookRepository } from '../app/core/data-access/logbook.repository';
import { createDemoLogbook } from './demo-logbook';
import { DEMO_PINNED_TITLES, DEMO_VERSION, DemoSeeder, demoSeededKey } from './demo-seeder';
import { createDemoLogbooks } from './demo-set';
import { DEMO_USERS } from './demo-users';

const [anna, jon] = DEMO_USERS;

const collectTypes = (node: JSONContent, found = new Set<string>()): Set<string> => {
  if (node.type) {
    found.add(node.type);
  }
  node.content?.forEach((child) => collectTypes(child, found));
  return found;
};

describe('demo logbook set', () => {
  const bundles = createDemoLogbooks(anna);

  it('gives the user several logbooks with a realistic spread', () => {
    expect(bundles.length).toBeGreaterThanOrEqual(6);
    const logbooks = bundles.map((b) => b.logbook);
    const roles = new Set(logbooks.map((l) => roleOf(l, anna)));
    expect(roles).toEqual(new Set(['owner', 'editor', 'viewer']));
    expect(new Set(logbooks.map((l) => l.visibility))).toEqual(
      new Set(['private', 'facility-read']),
    );
    expect(new Set(logbooks.map((l) => l.instrument)).size).toBeGreaterThanOrEqual(5);
    expect(logbooks.every((l) => l.demo)).toBeTrue();
  });

  it('has enough logbooks to need a second page of the list', () => {
    expect(bundles.length).toBeGreaterThan(11);
  });

  it('mixes very long descriptions with short ones, to show the hover cards and the cut-off text', () => {
    const lengths = bundles.map((b) => b.logbook.description.length);
    expect(lengths.filter((n) => n > 400).length).toBeGreaterThanOrEqual(4);
    expect(lengths.filter((n) => n < 100).length).toBeGreaterThanOrEqual(3);
  });

  it('has logbooks with many members, and some with few', () => {
    const counts = bundles.map((b) => b.logbook.members.length);
    expect(counts.filter((n) => n > 3).length).toBeGreaterThanOrEqual(5);
    expect(Math.max(...counts)).toBeGreaterThanOrEqual(8);
    expect(counts.filter((n) => n <= 3).length).toBeGreaterThanOrEqual(3);
  });

  it('uses stable ids per user, different between users', () => {
    const ids = bundles.map((b) => b.logbook.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(createDemoLogbooks(anna).map((b) => b.logbook.id)).toEqual(ids);
    expect(
      createDemoLogbooks(jon)
        .map((b) => b.logbook.id)
        .some((id) => ids.includes(id)),
    ).toBeFalse();
  });

  it('is internally consistent and never dated in the future', () => {
    const now = Date.now();
    for (const { logbook, entries, versions } of bundles) {
      expect(entries.length).withContext(logbook.title).toBeGreaterThan(0);
      expect(entries.every((e) => e.logbookId === logbook.id)).toBeTrue();
      const entryIds = new Set(entries.map((e) => e.id));
      expect(versions.every((v) => entryIds.has(v.entryId))).toBeTrue();
      const stamps = [
        logbook.updatedAt,
        ...entries.map((e) => e.updatedAt),
        ...versions.map((v) => v.savedAt),
      ];
      expect(stamps.every((s) => Date.parse(s) <= now))
        .withContext(logbook.title)
        .toBeTrue();
    }
  });

  it('every logbook includes the signed-in user as a member', () => {
    expect(bundles.every((b) => b.logbook.members.some((m) => m.user.id === anna.id))).toBeTrue();
  });

  describe('the detailed logbook', () => {
    const detailed = createDemoLogbook(anna);

    it('makes the user the owner and has history', () => {
      expect(detailed.logbook.members.find((m) => m.role === 'owner')?.user.id).toBe(anna.id);
      expect(detailed.versions.length).toBeGreaterThan(0);
    });

    it('exercises the rich features the editor offers', () => {
      const types = new Set(detailed.entries.flatMap((e) => [...collectTypes(e.content)]));
      for (const type of [
        'table',
        'taskList',
        'image',
        'sampleInfo',
        'codeBlock',
        'blockquote',
        'orderedList',
        'bulletList',
      ]) {
        expect(types.has(type)).withContext(type).toBeTrue();
      }
    });
  });

  describe('against the editor schema', () => {
    beforeEach(() =>
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] }),
    );

    it('every entry and version is a valid document', () => {
      const editor = new Editor({
        extensions: createEditorExtensions({
          placeholder: '',
          upload: () => Promise.reject(),
          onError: () => undefined,
        }),
      });
      for (const { content } of bundles.flatMap((b) => [...b.entries, ...b.versions])) {
        expect(() => editor.schema.nodeFromJSON(content).check()).not.toThrow();
      }
      editor.destroy();
    });
  });
});

describe('DemoSeeder', () => {
  let repo: IndexedDbLogbookRepository;
  let seeder: DemoSeeder;
  let dbName: string;
  const total = createDemoLogbooks(anna).length;

  const clearMarkers = () => DEMO_USERS.forEach((u) => localStorage.removeItem(demoSeededKey(u)));

  beforeEach(() => {
    clearMarkers();
    dbName = `elogbook-test-${crypto.randomUUID()}`;
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        IndexedDbLogbookRepository,
        { provide: LogbookRepository, useExisting: IndexedDbLogbookRepository },
        { provide: LOGBOOK_DB_OPTIONS, useValue: { name: dbName } },
        DemoSeeder,
      ],
    });
    repo = TestBed.inject(IndexedDbLogbookRepository);
    seeder = TestBed.inject(DemoSeeder);
  });

  afterEach(() => {
    clearMarkers();
    indexedDB.deleteDatabase(dbName);
  });

  it('creates every demo logbook with entries, and history for the detailed one', async () => {
    await seeder.ensureFor(anna);
    const logbooks = await repo.listLogbooks(anna);

    expect(logbooks.length).toBe(total);
    const detailed = logbooks.find((l) => l.title.startsWith('LoKI'))!;
    const runs = (await repo.listEntries(detailed.id)).find((e) => e.title.startsWith('Runs'))!;
    expect((await repo.listVersions(runs.id)).length).toBe(3);
  });

  it('pins a few entries so the "Pinned entries" panel has something to show', async () => {
    await seeder.ensureFor(anna);

    const pinned = await repo.listPinnedEntries(anna);
    expect(pinned.length).toBe(DEMO_PINNED_TITLES.length);
    expect(
      pinned.every((p) => DEMO_PINNED_TITLES.some((t) => p.entryTitle.startsWith(t))),
    ).toBeTrue();
    expect(await repo.listPinnedEntries(jon)).toEqual([]); // pins are personal
  });

  it('pins the demo entries in a fixed order, so the panel always starts the same way', async () => {
    await seeder.ensureFor(anna);

    const titles = (await repo.listPinnedEntries(anna)).map((p) => p.entryTitle);
    expect(titles.map((t) => DEMO_PINNED_TITLES.findIndex((d) => t.startsWith(d)))).toEqual([
      0, 1, 2,
    ]);
  });

  it('leaves the pins of someone who already has their own alone', async () => {
    await seeder.ensureFor(anna);
    const [first, ...others] = await repo.listPinnedEntries(anna);
    for (const other of others) {
      await repo.setEntryPinned(anna, other.entryId, false);
    }
    localStorage.setItem(demoSeededKey(anna), 'old');

    await seeder.ensureFor(anna);

    expect((await repo.listPinnedEntries(anna)).map((p) => p.entryId)).toEqual([first.entryId]);
  });

  it('does not duplicate anything, even when asked concurrently or again later', async () => {
    await Promise.all([seeder.ensureFor(anna), seeder.ensureFor(anna)]);
    await seeder.ensureFor(anna);

    expect((await repo.listLogbooks(anna)).length).toBe(total);
  });

  it('does not bring back a demo logbook the user deleted', async () => {
    await seeder.ensureFor(anna);
    const [first] = await repo.listLogbooks(anna);
    await repo.deleteLogbook(first.id);

    await seeder.ensureFor(anna);

    expect((await repo.listLogbooks(anna)).length).toBe(total - 1);
  });

  it('brings someone seeded with an older version up to date, keeping their entries', async () => {
    await seeder.ensureFor(anna);
    const [stale] = (await repo.listLogbooks(anna)).filter((l) => l.title.startsWith('LoKI'));
    await repo.updateLogbook(stale.id, {
      description: 'old text',
      members: stale.members.slice(0, 1),
    });
    const entriesBefore = (await repo.listEntries(stale.id)).map((e) => e.id).sort();
    localStorage.setItem(demoSeededKey(anna), 'true'); // what the first version stored

    await seeder.ensureFor(anna);

    const logbooks = await repo.listLogbooks(anna);
    const fresh = logbooks.find((l) => l.id === stale.id)!;
    expect(logbooks.length).toBe(total);
    expect(fresh.description).not.toBe('old text');
    expect(fresh.members.length).toBeGreaterThan(3);
    expect((await repo.listEntries(stale.id)).map((e) => e.id).sort()).toEqual(entriesBefore);
    expect(localStorage.getItem(demoSeededKey(anna))).toBe(DEMO_VERSION);
  });

  it('completes a partial seed without duplicating what exists', async () => {
    await repo.importLogbook(createDemoLogbooks(anna)[0]);
    await seeder.ensureFor(anna);

    expect((await repo.listLogbooks(anna)).length).toBe(total);
  });

  it('keeps users separate, including shared-access demo logbooks', async () => {
    await seeder.ensureFor(anna);
    await seeder.ensureFor(jon);

    expect((await repo.listLogbooks(anna)).length).toBe(total);
    expect((await repo.listLogbooks(jon)).length).toBe(total);
    const annaIds = new Set((await repo.listLogbooks(anna)).map((l) => l.id));
    expect((await repo.listLogbooks(jon)).some((l) => annaIds.has(l.id))).toBeFalse();
  });
});
