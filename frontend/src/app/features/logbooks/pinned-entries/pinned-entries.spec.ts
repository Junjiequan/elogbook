import type { Mock } from 'vitest';
import { DATE_PIPE_DEFAULT_OPTIONS } from '@angular/common';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { CdkDropList } from '@angular/cdk/drag-drop';
import { provideRouter } from '@angular/router';
import { DATE_TIME_FORMAT } from '../../../core/date-format';
import { LogbookRepository } from '../../../core/data-access/logbook.repository';
import { MAX_PINNED_ENTRIES, type PinnedEntry } from '../../../core/models/logbook.models';
import { TEST_USERS } from '../../../testing/test-users';
import { provideFakeAuth } from '../../../testing/fake-auth';
import { LogbooksStore, type LoadStatus } from '../logbooks.store';
import { PinnedEntries } from './pinned-entries';

const [anna, jon] = TEST_USERS;

const item = (id: string, overrides: Partial<PinnedEntry> = {}): PinnedEntry => ({
  entryId: `e-${id}`,
  entryTitle: `Entry ${id}`,
  logbookId: `l-${id}`,
  logbookTitle: `Logbook ${id}`,
  instrument: 'LoKI',
  pinnedAt: '2026-10-09T08:46:00Z',
  updatedAt: '2026-10-09T08:46:00',
  updatedBy: anna,
  ...overrides,
});

describe('PinnedEntries', () => {
  let fixture: ComponentFixture<PinnedEntries>;
  let repo: Record<'listPinnedEntries' | 'setEntryPinned' | 'reorderPinnedEntries', Mock>;
  const el = () => fixture.nativeElement as HTMLElement;
  const tiles = () => Array.from(el().querySelectorAll<HTMLAnchorElement>('a.tile'));

  const settle = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  const create = async (pinned: PinnedEntry[], status: LoadStatus = 'ready') => {
    repo = {
      listPinnedEntries: vi.fn().mockName('LogbookRepository.listPinnedEntries'),
      setEntryPinned: vi.fn().mockName('LogbookRepository.setEntryPinned'),
      reorderPinnedEntries: vi.fn().mockName('LogbookRepository.reorderPinnedEntries'),
    };
    repo.listPinnedEntries.mockResolvedValue(pinned);
    repo.setEntryPinned.mockResolvedValue(undefined);
    repo.reorderPinnedEntries.mockResolvedValue(undefined);
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideFakeAuth(anna),
        { provide: DATE_PIPE_DEFAULT_OPTIONS, useValue: { dateFormat: DATE_TIME_FORMAT } },
        { provide: LogbookRepository, useValue: repo },
        { provide: LogbooksStore, useValue: { status: signal(status), logbooks: signal([]) } },
      ],
    });
    fixture = TestBed.createComponent(PinnedEntries);
    await settle();
  };

  it('shows the pinned entries, each linking straight to its page', async () => {
    await create([item('1'), item('2')]);

    expect(el().querySelector('h2')!.textContent).toContain('Pinned entries');
    expect(tiles().map((t) => t.getAttribute('href'))).toEqual([
      '/logbooks/l-1/entries/e-1',
      '/logbooks/l-2/entries/e-2',
    ]);
    expect(tiles()[0].querySelector('.entry')!.textContent).toBe('Entry 1');
    expect(tiles()[0].querySelector('.logbook-name')!.textContent).toBe('Logbook 1');
  });

  it('says which logbook an entry is in, as its own labelled line above the entry title', async () => {
    await create([item('1', { entryTitle: 'Day 1', logbookTitle: 'LoKI beamtime 2026-0412' })]);

    const tile = tiles()[0];
    const logbook = tile.querySelector('.logbook')!;
    const entry = tile.querySelector('.entry')!;
    expect(logbook.querySelector('mat-icon')!.textContent).toBe('menu_book');
    expect(logbook.textContent).toContain('LoKI beamtime 2026-0412');
    expect(logbook.compareDocumentPosition(entry) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(getComputedStyle(logbook).backgroundColor).not.toBe('rgba(0, 0, 0, 0)'); // a visible label
    expect(tile.getAttribute('aria-label')).toBe('Day 1, in the logbook LoKI beamtime 2026-0412');
  });

  it('keeps the logbook name to a single line, cut with an ellipsis when it is long', async () => {
    await create([item('1', { logbookTitle: 'A very long logbook name '.repeat(8) })]);

    const name = tiles()[0].querySelector<HTMLElement>('.logbook-name')!;
    const lineHeight = parseFloat(getComputedStyle(name).lineHeight);
    expect(getComputedStyle(name).textOverflow).toBe('ellipsis');
    expect(getComputedStyle(name).whiteSpace).toBe('nowrap');
    expect(name.getBoundingClientRect().height).toBeLessThan(lineHeight * 1.5);
  });

  it('shows when the entry was last updated, year first', async () => {
    await create([item('1')]);

    const updated = tiles()[0].querySelector('.updated')!.textContent!.trim();
    expect(updated).toMatch(/^Updated 2026-10-09 \d{2}:\d{2} by /);
  });

  it('says who last updated the entry: "you" for the signed-in user, otherwise their name', async () => {
    await create([item('1'), item('2', { updatedBy: jon })]);

    const lines = tiles().map((t) =>
      t.querySelector('.updated')!.textContent!.replace(/\s+/g, ' ').trim(),
    );
    expect(lines[0]).toMatch(/^Updated 2026-10-09 \d{2}:\d{2} by you$/);
    expect(lines[1]).toMatch(new RegExp(` by ${jon.name}$`));
  });

  it('shows who updated it in a colour of its own, apart from the date', async () => {
    await create([item('1', { updatedBy: jon })]);

    const updated = tiles()[0].querySelector('.updated')!;
    const who = updated.querySelector('.who')!;
    expect(who.textContent).toBe(jon.name);
    expect(getComputedStyle(who).color).not.toBe(getComputedStyle(updated).color);
  });

  it('keeps the logbook name clear of the cross, even when the name is long', async () => {
    await create([item('1', { logbookTitle: 'A very long logbook name '.repeat(8) })]);

    const name = tiles()[0].querySelector('.logbook')!.getBoundingClientRect();
    const cross = el().querySelector('button.unpin')!.getBoundingClientRect();
    expect(name.right).toBeLessThanOrEqual(cross.left);
    const updated = tiles()[0].querySelector('.updated')!.getBoundingClientRect();
    expect(updated.right).toBeLessThanOrEqual(cross.left + cross.width);
  });

  it('asks for this person’s pins', async () => {
    await create([item('1')]);

    expect(repo.listPinnedEntries).toHaveBeenCalled();
  });

  it('calls an untitled entry "Untitled entry"', async () => {
    await create([item('1', { entryTitle: '' })]);

    expect(tiles()[0].querySelector('.entry')!.textContent).toBe('Untitled entry');
  });

  it('is empty, heading and all, when nothing is pinned', async () => {
    await create([]);

    expect(el().querySelector('h2')).toBeNull();
    expect(el().querySelector('section')).toBeNull();
    expect(tiles().length).toBe(0);
  });

  it('waits for the logbooks to load before looking', async () => {
    await create([item('1')], 'loading');

    expect(repo.listPinnedEntries).not.toHaveBeenCalled();
  });

  it('takes a pin off with the cross on its tile, and then shows what is left', async () => {
    await create([item('1'), item('2')]);
    repo.listPinnedEntries.mockResolvedValue([item('2')]);

    el().querySelector<HTMLButtonElement>('button[aria-label="Unpin Entry 1"]')!.click();
    await settle();
    await settle();

    expect(repo.setEntryPinned).toHaveBeenCalledTimes(1);

    expect(repo.setEntryPinned).toHaveBeenCalledWith('e-1', false);
    expect(tiles().map((t) => t.querySelector('.entry')!.textContent)).toEqual(['Entry 2']);
  });

  it('does not open the entry when the cross is pressed: it is not part of the link', async () => {
    await create([item('1')]);

    const cross = el().querySelector('button.unpin')!;
    expect(cross.closest('a')).toBeNull();
  });

  it('is a panel of its own, apart from the list: tinted, bordered, with a pin in its heading', async () => {
    await create([item('1')]);

    const panel = getComputedStyle(el().querySelector('section')!);
    expect(panel.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
    expect(panel.borderTopWidth).toBe('1px');
    expect(el().querySelector('h2 mat-icon')!.textContent).toBe('push_pin');
    expect(getComputedStyle(tiles()[0]).backgroundColor).not.toBe(panel.backgroundColor);
  });

  describe('the free places', () => {
    const places = () => Array.from(el().querySelectorAll('li.free'));

    it('fills the rest of the row with quiet placeholders, so it never looks half empty', async () => {
      await create([item('1')]);

      expect(tiles().length).toBe(1);
      expect(places().length).toBe(MAX_PINNED_ENTRIES - 1);
      expect(places()[0].textContent).toContain('Pin an entry to keep it here');
      expect(getComputedStyle(places()[0]).borderStyle).toBe('dashed');
    });

    it('has none when every place is taken', async () => {
      await create(Array.from({ length: MAX_PINNED_ENTRIES }, (_, i) => item(String(i))));

      expect(places().length).toBe(0);
    });

    it('keeps the placeholders out of what a screen reader reads', async () => {
      await create([item('1')]);

      expect(places().every((p) => p.getAttribute('aria-hidden') === 'true')).toBe(true);
    });
  });

  describe('reordering', () => {
    const order = () => tiles().map((t) => t.querySelector('.entry')!.textContent);
    const grip = (index: number) => el().querySelectorAll<HTMLButtonElement>('button.grip')[index];
    const dropList = () => fixture.debugElement.query(By.directive(CdkDropList));

    it('has a grip to take hold of on every tile', async () => {
      await create([item('1'), item('2')]);

      expect(el().querySelectorAll('button.grip').length).toBe(2);
      expect(grip(0).getAttribute('aria-keyshortcuts')).toBe('Alt+ArrowLeft Alt+ArrowRight');
    });

    it('follows a drag at once, and saves the new order', async () => {
      await create([item('1'), item('2'), item('3')]);

      dropList().triggerEventHandler('cdkDropListDropped', { previousIndex: 0, currentIndex: 2 });
      await settle();

      expect(order()).toEqual(['Entry 2', 'Entry 3', 'Entry 1']);
      expect(repo.reorderPinnedEntries).toHaveBeenCalledTimes(1);
      expect(repo.reorderPinnedEntries).toHaveBeenCalledWith(['e-2', 'e-3', 'e-1']);
    });

    it('moves a tile one place with Alt and an arrow key', async () => {
      await create([item('1'), item('2'), item('3')]);

      grip(1).dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowLeft', altKey: true, bubbles: true }),
      );
      await settle();
      expect(order()).toEqual(['Entry 2', 'Entry 1', 'Entry 3']);

      grip(0).dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight', altKey: true, bubbles: true }),
      );
      await settle();
      expect(order()).toEqual(['Entry 1', 'Entry 2', 'Entry 3']);
      expect(repo.reorderPinnedEntries).toHaveBeenCalledTimes(2);
    });

    it('does nothing at the ends, or for an arrow key without Alt', async () => {
      await create([item('1'), item('2')]);

      grip(0).dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowLeft', altKey: true, bubbles: true }),
      );
      grip(1).dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight', altKey: true, bubbles: true }),
      );
      grip(0).dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      await settle();

      expect(order()).toEqual(['Entry 1', 'Entry 2']);
      expect(repo.reorderPinnedEntries).not.toHaveBeenCalled();
    });
  });
});
