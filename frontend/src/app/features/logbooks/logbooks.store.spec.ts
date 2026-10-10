import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TEST_USERS } from '../../testing/test-users';
import { LogbookRepository } from '../../core/data-access/logbook.repository';
import type { Logbook, User } from '../../core/models/logbook.models';
import { provideFakeAuth } from '../../testing/fake-auth';
import { LogbooksStore } from './logbooks.store';
import { OWNER_ACCESS, accessFor } from '../../testing/logbook-fixtures';

const [anna, jon] = TEST_USERS;

const logbook = (id: string, owner = anna): Logbook => ({
  id,
  title: `Logbook ${id}`,
  description: '',
  instrument: null,
  proposalId: null,
  visibility: 'private',
  members: [{ user: owner, role: 'owner' }],
  owner: owner,
  ...OWNER_ACCESS,
  demo: false,
  createdAt: '2026-10-01T10:00:00Z',
  updatedAt: '2026-10-01T10:00:00Z',
});

/** The logbook as the server would describe it to this person. */
const seenBy = (book: Logbook, user: User, admin = false): Logbook => ({
  ...book,
  ...accessFor(book, user, admin),
});

describe('LogbooksStore.delete', () => {
  const setup = (user = anna, admin = false) => {
    const repo = {
      listLogbooks: vi.fn().mockName('LogbookRepository.listLogbooks'),
      deleteLogbook: vi.fn().mockName('LogbookRepository.deleteLogbook'),
    };
    repo.listLogbooks.mockResolvedValue(
      [
        logbook('mine', anna),
        logbook('theirs', jon),
        { ...logbook('sample', anna), demo: true },
      ].map((book) => seenBy(book, user, admin)),
    );
    repo.deleteLogbook.mockResolvedValue(undefined);
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideFakeAuth(user, { admin }),
        { provide: LogbookRepository, useValue: repo },
      ],
    });
    const store = TestBed.inject(LogbooksStore);
    return { repo, store };
  };

  const loaded = async (store: LogbooksStore) => {
    await store.load();
    return store;
  };

  it('lets an owner delete their logbook and removes it from the list', async () => {
    const { repo, store } = setup();
    await loaded(store);

    await store.delete('mine');

    expect(repo.deleteLogbook).toHaveBeenCalledTimes(1);

    expect(repo.deleteLogbook).toHaveBeenCalledWith('mine');
    expect(store.logbooks().map((l) => l.id)).toEqual(['theirs', 'sample']);
  });

  it('refuses to delete a logbook owned by someone else', async () => {
    const { repo, store } = setup();
    await loaded(store);

    await expect(store.delete('theirs')).rejects.toThrow();
    expect(repo.deleteLogbook).not.toHaveBeenCalled();
    expect(store.logbooks().length).toBe(3);
  });

  it('never deletes a sample logbook, not even for an administrator', async () => {
    const { repo, store } = setup(anna, true);
    await loaded(store);

    await expect(store.delete('sample')).rejects.toThrowError(/Sample logbooks cannot be deleted/);
    expect(repo.deleteLogbook).not.toHaveBeenCalled();
  });

  it('lets an administrator delete someone else’s logbook that they can open', async () => {
    const { repo, store } = setup(anna, true);
    repo.listLogbooks.mockResolvedValue([
      seenBy({ ...logbook('theirs', jon), visibility: 'facility-read' }, anna, true),
    ]);
    await loaded(store);

    await store.delete('theirs');

    expect(repo.deleteLogbook).toHaveBeenCalledTimes(1);

    expect(repo.deleteLogbook).toHaveBeenCalledWith('theirs');
  });
});
