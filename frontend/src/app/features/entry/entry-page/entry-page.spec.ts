import { provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import {
  LogbookRepository,
  PinLimitReachedError,
} from '../../../core/data-access/logbook.repository';
import { ProposalRepository } from '../../../core/data-access/proposal.repository';
import type { Entry, Logbook, MemberRole } from '../../../core/models/logbook.models';
import { DemoProposalRepository } from '../../../../demo/demo-proposals';
import { DEMO_USERS } from '../../../../demo/demo-users';
import { provideFakeAuth } from '../../../testing/fake-auth';
import { EntriesStore } from '../../logbook/entries.store';
import { LogbooksStore } from '../../logbooks/logbooks.store';
import { EntryAutosave, type SaveStatus } from '../entry-autosave';
import { EntryPage } from './entry-page';

const [anna, jon] = DEMO_USERS;

const entry: Entry = {
  id: 'e1',
  logbookId: 'l1',
  title: 'Day 1',
  content: {
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text: 'hello' }] }],
  },
  revision: 1,
  createdAt: '2026-10-01T10:00:00Z',
  updatedAt: '2026-10-01T10:00:00Z',
  updatedBy: anna,
};

const logbook = (role: MemberRole): Logbook => ({
  id: 'l1',
  title: 'Beamtime 1',
  description: '',
  instrument: null,
  proposalId: null,
  visibility: 'private',
  members: [
    { user: anna, role: 'owner' },
    { user: jon, role },
  ],
  createdAt: '2026-10-01T10:00:00Z',
  updatedAt: '2026-10-01T10:00:00Z',
});

describe('EntryPage', () => {
  let fixture: ComponentFixture<EntryPage>;
  let autosave: Record<string, unknown> & {
    entry: ReturnType<typeof signal<Entry | undefined>>;
    status: ReturnType<typeof signal<SaveStatus>>;
    loadFailed: ReturnType<typeof signal<boolean>>;
    open: jasmine.Spy;
    edit: jasmine.Spy;
    saveVersion: jasmine.Spy;
    discard: jasmine.Spy;
  };
  let entries: { delete: jasmine.Spy };
  let dialog: { open: jasmine.Spy };
  let navigate: jasmine.Spy;
  let pins: jasmine.SpyObj<LogbookRepository>;
  const el = () => fixture.nativeElement as HTMLElement;
  const button = (label: string) =>
    el().querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);

  const settle = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve)); // let the awaited steps of a click handler finish
    fixture.detectChanges();
  };

  const create = async (
    options: { as?: typeof anna; role?: MemberRole; loaded?: boolean; pinned?: boolean } = {},
  ) => {
    const { as = anna, role = 'editor', loaded = true } = options;
    autosave = {
      entry: signal<Entry | undefined>(loaded ? entry : undefined),
      docKey: signal(loaded ? 'e1:0' : null),
      status: signal<SaveStatus>('saved'),
      loadFailed: signal(false),
      savedCount: signal(0),
      open: jasmine.createSpy('open').and.resolveTo(),
      edit: jasmine.createSpy('edit'),
      saveVersion: jasmine.createSpy('saveVersion').and.resolveTo(),
      discard: jasmine.createSpy('discard').and.resolveTo(),
      flush: jasmine.createSpy('flush').and.resolveTo(),
    };
    entries = { delete: jasmine.createSpy('delete').and.resolveTo() };
    dialog = { open: jasmine.createSpy('open').and.returnValue({ afterClosed: () => of(true) }) };
    const repo = jasmine.createSpyObj<LogbookRepository>('LogbookRepository', [
      'listVersions',
      'isEntryPinned',
      'setEntryPinned',
    ]);
    repo.listVersions.and.resolveTo([]);
    repo.isEntryPinned.and.resolveTo(options.pinned ?? false);
    repo.setEntryPinned.and.resolveTo();
    pins = repo;
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideFakeAuth(as),
        { provide: LogbookRepository, useValue: repo },
        { provide: ProposalRepository, useClass: DemoProposalRepository },
        { provide: LogbooksStore, useValue: { logbooks: signal([logbook(role)]) } },
        { provide: EntriesStore, useValue: entries },
        { provide: MatDialog, useValue: dialog },
      ],
    }).overrideComponent(EntryPage, {
      set: { providers: [{ provide: EntryAutosave, useValue: autosave }] },
    });
    navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    fixture = TestBed.createComponent(EntryPage);
    fixture.componentRef.setInput('logbookId', 'l1');
    fixture.componentRef.setInput('entryId', 'e1');
    await settle();
  };

  const title = () => el().querySelector<HTMLInputElement>('input.title')!;

  it('opens the entry it is pointed at', async () => {
    await create();

    expect(autosave.open).toHaveBeenCalledWith('e1');
  });

  it('shows a spinner while the entry loads, and says so when it cannot be found', async () => {
    await create({ loaded: false });
    expect(el().querySelector('mat-progress-spinner')).not.toBeNull();

    autosave.loadFailed.set(true);
    await settle();
    expect(el().querySelector('[role="alert"]')!.textContent).toContain('could not be found');
  });

  describe('for someone who can edit', () => {
    beforeEach(async () => create({ as: jon, role: 'editor' }));

    it('shows the title and the content, and an editable title', () => {
      expect(title().value).toBe('Day 1');
      expect(title().readOnly).toBeFalse();
      expect(el().querySelector('.rt-content')!.textContent).toContain('hello');
    });

    it('sends title edits to autosave', async () => {
      title().value = 'Day one';
      title().dispatchEvent(new Event('input'));

      expect(autosave.edit).toHaveBeenCalledWith({ title: 'Day one' });
    });

    it('shows the save state', async () => {
      expect(el().querySelector('.status')!.textContent).toContain('All changes saved');

      autosave.status.set('error');
      await settle();
      expect(el().querySelector('.status')!.textContent).toContain('Could not save');
      expect(el().querySelector('.status')!.classList).toContain('error');
    });

    it('saves a version on request', async () => {
      button('Save version')!.click();
      await settle();

      expect(autosave.saveVersion).toHaveBeenCalled();
    });

    it('cannot delete the entry, since only the owner can', () => {
      expect(button('Delete entry')).toBeNull();
    });

    it('opens and closes the version history', async () => {
      expect(el().querySelector('app-history-panel')).toBeNull();

      button('Version history')!.click();
      await settle();
      expect(el().querySelector('app-history-panel')).not.toBeNull();
      expect(button('Version history')!.getAttribute('aria-pressed')).toBe('true');

      button('Close version history')!.click();
      await settle();
      expect(el().querySelector('app-history-panel')).toBeNull();
    });

    it('links to the export of just this entry', () => {
      const link = el().querySelector<HTMLAnchorElement>('a[aria-label="Export entry"]')!;
      expect(link.getAttribute('href')).toBe('/logbooks/l1/print?entry=e1');
    });
  });

  describe('pinning', () => {
    it('offers to pin the entry, and pins it with a click', async () => {
      await create({ as: jon, role: 'editor' });
      expect(button('Pin entry')).not.toBeNull();
      expect(button('Pin entry')!.getAttribute('aria-pressed')).toBe('false');

      button('Pin entry')!.click();
      await settle();

      expect(pins.setEntryPinned).toHaveBeenCalledOnceWith(jon, 'e1', true);
      expect(button('Unpin entry')!.getAttribute('aria-pressed')).toBe('true');
      expect(button('Unpin entry')!.textContent).toContain('Pinned');
    });

    it('shows an entry that is already pinned as pinned, and lets go with a click', async () => {
      await create({ as: jon, role: 'editor', pinned: true });
      expect(button('Unpin entry')).not.toBeNull();

      button('Unpin entry')!.click();
      await settle();

      expect(pins.setEntryPinned).toHaveBeenCalledOnceWith(jon, 'e1', false);
      expect(button('Pin entry')).not.toBeNull();
    });

    it('is open to a viewer too: a pin is a personal bookmark, not an edit', async () => {
      await create({ as: jon, role: 'viewer' });

      expect(button('Pin entry')).not.toBeNull();
    });

    it('explains the limit when there are already as many pins as allowed, and does not pin', async () => {
      await create({ as: jon, role: 'editor' });
      const snack = spyOn(TestBed.inject(MatSnackBar), 'open');
      pins.setEntryPinned.and.rejectWith(new PinLimitReachedError());

      button('Pin entry')!.click();
      await settle();

      expect(snack.calls.mostRecent().args[0]).toBe(
        'You can pin up to 4 entries. Unpin one first.',
      );
      expect(button('Pin entry')).not.toBeNull();
    });

    it('undoes itself and says so when the pin could not be saved', async () => {
      await create({ as: jon, role: 'editor' });
      pins.setEntryPinned.and.rejectWith(new Error('no'));

      button('Pin entry')!.click();
      await settle();

      expect(button('Pin entry')).not.toBeNull();
    });
  });

  describe('for a viewer', () => {
    beforeEach(async () => create({ as: jon, role: 'viewer' }));

    it('is read-only, with no way to save a version', () => {
      expect(title().readOnly).toBeTrue();
      expect(el().querySelector('.status')!.textContent).toContain('View only');
      expect(button('Save version')).toBeNull();
      expect(button('Delete entry')).toBeNull();
    });
  });

  describe('for the owner', () => {
    beforeEach(async () => create({ as: anna }));

    it('deletes the entry after confirmation, then goes back to the logbook', async () => {
      button('Delete entry')!.click();
      await settle();

      expect(autosave.discard).toHaveBeenCalled();
      expect(entries.delete).toHaveBeenCalledWith(entry, logbook('editor'));
      expect(navigate).toHaveBeenCalledWith(['/logbooks', 'l1']);
    });

    it('does nothing when the confirmation is declined', async () => {
      dialog.open.and.returnValue({ afterClosed: () => of(false) });

      button('Delete entry')!.click();
      await settle();

      expect(entries.delete).not.toHaveBeenCalled();
      expect(navigate).not.toHaveBeenCalled();
    });

    it('stays on the entry and says so when the deletion fails', async () => {
      entries.delete.and.rejectWith(new Error('no'));

      button('Delete entry')!.click();
      await settle();

      expect(navigate).not.toHaveBeenCalled();
    });
  });
});
