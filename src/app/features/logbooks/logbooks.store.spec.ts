import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DEMO_USERS } from '../../../demo/demo-users';
import { LogbookRepository } from '../../core/data-access/logbook.repository';
import type { Logbook } from '../../core/models/logbook.models';
import { provideFakeAuth } from '../../testing/fake-auth';
import { LogbooksStore } from './logbooks.store';

const [anna, jon] = DEMO_USERS;

const logbook = (id: string, owner = anna): Logbook => ({
  id,
  title: `Logbook ${id}`,
  description: '',
  instrument: null,
  proposalId: null,
  visibility: 'private',
  members: [{ user: owner, role: 'owner' }],
  createdAt: '2026-10-01T10:00:00Z',
  updatedAt: '2026-10-01T10:00:00Z',
});

describe('LogbooksStore.delete', () => {
  const setup = (user = anna, admin = false) => {
    const repo = jasmine.createSpyObj<LogbookRepository>('LogbookRepository', [
      'listLogbooks',
      'deleteLogbook',
    ]);
    repo.listLogbooks.and.resolveTo([
      logbook('mine', anna),
      logbook('theirs', jon),
      { ...logbook('sample', anna), demo: true },
    ]);
    repo.deleteLogbook.and.resolveTo();
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

    expect(repo.deleteLogbook).toHaveBeenCalledOnceWith('mine');
    expect(store.logbooks().map((l) => l.id)).toEqual(['theirs', 'sample']);
  });

  it('refuses to delete a logbook owned by someone else', async () => {
    const { repo, store } = setup();
    await loaded(store);

    await expectAsync(store.delete('theirs')).toBeRejected();
    expect(repo.deleteLogbook).not.toHaveBeenCalled();
    expect(store.logbooks().length).toBe(3);
  });

  it('never deletes a demo logbook, not even for an administrator', async () => {
    const { repo, store } = setup(anna, true);
    await loaded(store);

    await expectAsync(store.delete('sample')).toBeRejectedWithError(
      /Demo logbooks cannot be deleted/,
    );
    expect(repo.deleteLogbook).not.toHaveBeenCalled();
  });

  it('lets an administrator delete someone else’s logbook', async () => {
    const { repo, store } = setup(anna, true);
    await loaded(store);

    await store.delete('theirs');

    expect(repo.deleteLogbook).toHaveBeenCalledOnceWith('theirs');
  });
});
