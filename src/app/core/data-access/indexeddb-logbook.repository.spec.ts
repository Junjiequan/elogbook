import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DEMO_USERS } from './demo-data';
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
        { provide: LOGBOOK_DB_OPTIONS, useValue: { name: dbName, seed: false } },
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
});
