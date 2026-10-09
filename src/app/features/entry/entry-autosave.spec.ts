import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DEMO_USERS } from '../../core/auth/current-user.service';
import { LogbookRepository } from '../../core/data-access/logbook.repository';
import type { Entry } from '../../core/models/logbook.models';
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
  updatedBy: DEMO_USERS[0],
};

describe('EntryAutosave', () => {
  let repo: jasmine.SpyObj<LogbookRepository>;
  let autosave: EntryAutosave;

  beforeEach(async () => {
    jasmine.clock().install();
    repo = jasmine.createSpyObj<LogbookRepository>('LogbookRepository', ['getEntry', 'saveEntry']);
    repo.getEntry.and.resolveTo(entry);
    repo.saveEntry.and.callFake(async (_id, changes) => ({ ...entry, ...changes, revision: 2 }));
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        EntryAutosave,
        EntriesStore,
        { provide: LogbookRepository, useValue: repo },
      ],
    });
    autosave = TestBed.inject(EntryAutosave);
    await autosave.open('e1');
  });

  afterEach(() => jasmine.clock().uninstall());

  it('waits for a pause in typing and merges edits into one save', async () => {
    autosave.edit({ title: 'T' });
    jasmine.clock().tick(AUTOSAVE_DEBOUNCE_MS - 1);
    autosave.edit({ content: { type: 'doc', content: [] } });
    jasmine.clock().tick(AUTOSAVE_DEBOUNCE_MS - 1);
    expect(repo.saveEntry).not.toHaveBeenCalled();
    expect(autosave.status()).toBe('dirty');

    jasmine.clock().tick(1);
    await autosave.flush();

    expect(repo.saveEntry).toHaveBeenCalledTimes(1);
    expect(repo.saveEntry.calls.mostRecent().args[1]).toEqual({
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
    repo.saveEntry.and.rejectWith(new Error('offline'));
    autosave.edit({ title: 'kept' });
    await autosave.flush();
    expect(autosave.status()).toBe('error');

    repo.saveEntry.and.callFake(async (_id, changes) => ({ ...entry, ...changes, revision: 3 }));
    jasmine.clock().tick(AUTOSAVE_RETRY_MS);
    await autosave.flush();

    expect(repo.saveEntry.calls.mostRecent().args[1]).toEqual({ title: 'kept' });
    expect(autosave.status()).toBe('saved');
  });

  it('flushes pending edits before opening another entry', async () => {
    autosave.edit({ title: 'unsaved' });
    await autosave.open('e2');

    expect(repo.saveEntry).toHaveBeenCalledWith('e1', { title: 'unsaved' }, jasmine.anything());
  });
});
