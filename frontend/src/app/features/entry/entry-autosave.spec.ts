import type { Mock } from 'vitest';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TEST_USERS } from '../../testing/test-users';
import { EntryConflictError, LogbookRepository } from '../../core/data-access/logbook.repository';
import type { Entry } from '../../core/models/logbook.models';
import { provideFakeAuth } from '../../testing/fake-auth';
import { EntriesStore } from '../logbook/entries.store';
import { AUTOSAVE_DEBOUNCE_MS, AUTOSAVE_RETRY_MS, EntryAutosave } from './entry-autosave';

const entry: Entry = {
  id: 'e1',
  logbookId: 'l1',
  title: '',
  content: { type: 'doc', content: [{ type: 'paragraph' }] },
  revision: 1,
  createdAt: '',
  updatedAt: '',
  updatedBy: TEST_USERS[0],
};

describe('EntryAutosave', () => {
  let repo: Record<'getEntry' | 'saveEntry' | 'restoreVersion', Mock>;
  let autosave: EntryAutosave;

  beforeEach(async () => {
    vi.useFakeTimers();
    repo = {
      getEntry: vi.fn().mockName('LogbookRepository.getEntry'),
      saveEntry: vi.fn().mockName('LogbookRepository.saveEntry'),
      restoreVersion: vi.fn().mockName('LogbookRepository.restoreVersion'),
    };
    repo.getEntry.mockResolvedValue(entry);
    repo.saveEntry.mockImplementation(async (_id, changes) => ({
      ...entry,
      ...changes,
      revision: 2,
    }));
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideFakeAuth(),
        EntryAutosave,
        EntriesStore,
        { provide: LogbookRepository, useValue: repo },
      ],
    });
    autosave = TestBed.inject(EntryAutosave);
    await autosave.open('e1');
  });

  afterEach(() => vi.useRealTimers());

  it('waits for a pause in typing and merges edits into one save', async () => {
    autosave.edit({ title: 'T' });
    vi.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS - 1);
    autosave.edit({ content: { type: 'doc', content: [] } });
    vi.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS - 1);
    expect(repo.saveEntry).not.toHaveBeenCalled();
    expect(autosave.status()).toBe('dirty');

    vi.advanceTimersByTime(1);
    await autosave.flush();

    expect(repo.saveEntry).toHaveBeenCalledTimes(1);
    expect(vi.mocked(repo.saveEntry).mock.lastCall![1]).toEqual({
      title: 'T',
      content: { type: 'doc', content: [] },
    });
    expect(autosave.status()).toBe('saved');
  });

  it('flush saves immediately', async () => {
    autosave.edit({ title: 'now' });
    await autosave.flush();

    expect(repo.saveEntry).toHaveBeenCalledTimes(1);
  });

  it('keeps edits and retries after a failed save', async () => {
    repo.saveEntry.mockRejectedValue(new Error('offline'));
    autosave.edit({ title: 'kept' });
    await autosave.flush();
    expect(autosave.status()).toBe('error');

    repo.saveEntry.mockImplementation(async (_id, changes) => ({
      ...entry,
      ...changes,
      revision: 3,
    }));
    vi.advanceTimersByTime(AUTOSAVE_RETRY_MS);
    await autosave.flush();

    expect(vi.mocked(repo.saveEntry).mock.lastCall![1]).toEqual({ title: 'kept' });
    expect(autosave.status()).toBe('saved');
  });

  it('flushes pending edits before opening another entry', async () => {
    autosave.edit({ title: 'unsaved' });
    await autosave.open('e2');

    expect(repo.saveEntry).toHaveBeenCalledWith('e1', { title: 'unsaved' }, expect.anything());
  });

  it('discards unsaved edits without writing them', async () => {
    autosave.edit({ title: 'about to be deleted' });
    await autosave.discard();
    vi.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS * 2);
    await autosave.flush();

    expect(repo.saveEntry).not.toHaveBeenCalled();
    expect(autosave.status()).toBe('saved');
  });

  describe('revisions', () => {
    it('saves on top of the revision it opened, then on top of the one the server answered with', async () => {
      repo.saveEntry.mockImplementation(async (_id, changes, revision) => ({
        ...entry,
        ...changes,
        revision: revision + 1,
      }));

      autosave.edit({ title: 'one' });
      await autosave.flush();
      autosave.edit({ title: 'two' });
      await autosave.flush();

      expect(vi.mocked(repo.saveEntry).mock.calls.map(([, , revision]) => revision)).toEqual([
        1, 2,
      ]);
    });

    it('says "conflict" and keeps the edits, without retrying, when someone else saved first', async () => {
      repo.saveEntry.mockRejectedValue(new EntryConflictError(5));
      autosave.edit({ title: 'mine' });
      await autosave.flush();

      expect(autosave.status()).toBe('conflict');
      expect(autosave.entry()?.title).toBe('mine');

      vi.advanceTimersByTime(AUTOSAVE_RETRY_MS * 3); // no retry is scheduled
      expect(repo.saveEntry).toHaveBeenCalledTimes(1);
    });

    it('can be reloaded after a conflict: the edits are dropped and the server’s version is shown', async () => {
      repo.saveEntry.mockRejectedValue(new EntryConflictError(5));
      autosave.edit({ title: 'mine' });
      await autosave.flush();
      const before = autosave.docKey();
      repo.getEntry.mockResolvedValue({ ...entry, title: 'theirs', revision: 5 });

      await autosave.reload();

      expect(autosave.entry()?.title).toBe('theirs');
      expect(autosave.status()).toBe('saved');
      expect(autosave.docKey()).not.toBe(before); // the editor is rebuilt from it
      repo.saveEntry.mockImplementation(async (_id, changes, revision) => ({
        ...entry,
        ...changes,
        revision: revision + 1,
      }));
      autosave.edit({ title: 'next' });
      await autosave.flush();
      expect(vi.mocked(repo.saveEntry).mock.lastCall![2]).toBe(5);
    });

    it('keeps the version it restored as the revision to build on', async () => {
      repo.restoreVersion = vi
        .fn()
        .mockName('restoreVersion')
        .mockResolvedValue({
          ...entry,
          title: 'old',
          revision: 7,
        });
      repo.saveEntry.mockImplementation(async (_id, changes, revision) => ({
        ...entry,
        ...changes,
        revision: revision + 1,
      }));

      await autosave.restore('v1');
      autosave.edit({ title: 'after restore' });
      await autosave.flush();

      expect(vi.mocked(repo.saveEntry).mock.lastCall![2]).toBe(7);
    });
  });
});
