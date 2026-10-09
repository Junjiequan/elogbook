import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DEMO_USERS } from '../../demo/demo-users';
import { LogbookRepository } from '../../core/data-access/logbook.repository';
import type { Entry, Logbook, MemberRole, User } from '../../core/models/logbook.models';
import { provideFakeAuth } from '../../testing/fake-auth';
import { EntriesStore } from './entries.store';

const [anna, jon] = DEMO_USERS;

const logbook = (members: { user: User; role: MemberRole }[], demo = false): Logbook => ({
  id: 'l1',
  title: 'My logbook',
  description: '',
  instrument: null,
  proposalId: null,
  visibility: 'private',
  members,
  demo,
  createdAt: '2026-10-01T10:00:00Z',
  updatedAt: '2026-10-01T10:00:00Z',
});

const entry = (id: string): Entry => ({
  id,
  logbookId: 'l1',
  title: `Entry ${id}`,
  content: { type: 'doc', content: [] },
  revision: 1,
  createdAt: '2026-10-01T10:00:00Z',
  updatedAt: '2026-10-01T10:00:00Z',
  updatedBy: anna,
});

describe('EntriesStore.delete', () => {
  const setup = (user: User, admin = false) => {
    const repo = jasmine.createSpyObj<LogbookRepository>('LogbookRepository', [
      'listEntries',
      'deleteEntry',
    ]);
    repo.listEntries.and.resolveTo([entry('a'), entry('b')]);
    repo.deleteEntry.and.resolveTo();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideFakeAuth(user, { admin }),
        { provide: LogbookRepository, useValue: repo },
        EntriesStore,
      ],
    });
    return { repo, store: TestBed.inject(EntriesStore) };
  };

  const owned = logbook([
    { user: anna, role: 'owner' },
    { user: jon, role: 'editor' },
  ]);

  it('lets the owner delete an entry and drops it from the list', async () => {
    const { repo, store } = setup(anna);
    await store.load('l1');

    await store.delete(entry('a'), owned);

    expect(repo.deleteEntry).toHaveBeenCalledOnceWith('a');
    expect(store.entries().map((e) => e.id)).toEqual(['b']);
  });

  it('refuses an editor, who is not the owner', async () => {
    const { repo, store } = setup(jon);
    await store.load('l1');

    await expectAsync(store.delete(entry('a'), owned)).toBeRejected();
    expect(repo.deleteEntry).not.toHaveBeenCalled();
    expect(store.entries().length).toBe(2);
  });

  it('lets an administrator delete an entry in a logbook they do not own', async () => {
    const { repo, store } = setup(jon, true);
    await store.load('l1');

    await store.delete(entry('a'), logbook([{ user: anna, role: 'owner' }]));

    expect(repo.deleteEntry).toHaveBeenCalledOnceWith('a');
  });

  it('never deletes entries of a demo logbook, even for an administrator', async () => {
    const { repo, store } = setup(anna, true);
    await store.load('l1');

    await expectAsync(store.delete(entry('a'), { ...owned, demo: true })).toBeRejectedWithError(
      /demo/i,
    );
    expect(repo.deleteEntry).not.toHaveBeenCalled();
  });

  it('refuses an entry that belongs to a different logbook', async () => {
    const { repo, store } = setup(anna);

    await expectAsync(store.delete({ ...entry('a'), logbookId: 'other' }, owned)).toBeRejected();
    expect(repo.deleteEntry).not.toHaveBeenCalled();
  });
});
