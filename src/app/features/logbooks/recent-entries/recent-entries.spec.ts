import { provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LogbookRepository } from '../../../core/data-access/logbook.repository';
import type { RecentEntry } from '../../../core/models/logbook.models';
import { DEMO_USERS } from '../../../../demo/demo-users';
import { provideFakeAuth } from '../../../testing/fake-auth';
import { LogbooksStore, type LoadStatus } from '../logbooks.store';
import { RECENT_ENTRY_COUNT, RecentEntries } from './recent-entries';

const [anna, jon] = DEMO_USERS;

const item = (id: string, overrides: Partial<RecentEntry> = {}): RecentEntry => ({
  entryId: `e-${id}`,
  entryTitle: `Entry ${id}`,
  logbookId: `l-${id}`,
  logbookTitle: `Logbook ${id}`,
  instrument: 'LoKI',
  updatedAt: '2026-10-09T08:46:00',
  updatedBy: anna,
  ...overrides,
});

describe('RecentEntries', () => {
  let fixture: ComponentFixture<RecentEntries>;
  let repo: jasmine.SpyObj<LogbookRepository>;
  const el = () => fixture.nativeElement as HTMLElement;
  const tiles = () => Array.from(el().querySelectorAll<HTMLAnchorElement>('a.tile'));

  const create = async (recent: RecentEntry[], status: LoadStatus = 'ready') => {
    repo = jasmine.createSpyObj('LogbookRepository', ['listRecentEntries']);
    repo.listRecentEntries.and.resolveTo(recent);
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideFakeAuth(anna),
        { provide: LogbookRepository, useValue: repo },
        { provide: LogbooksStore, useValue: { status: signal(status), logbooks: signal([]) } },
      ],
    });
    fixture = TestBed.createComponent(RecentEntries);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  it('offers the entries edited last, each linking straight to its page', async () => {
    await create([item('1'), item('2')]);

    expect(el().querySelector('h2')!.textContent).toBe('Continue where you left off');
    expect(tiles().map((t) => t.getAttribute('href'))).toEqual([
      '/logbooks/l-1/entries/e-1',
      '/logbooks/l-2/entries/e-2',
    ]);
    expect(tiles()[0].querySelector('.entry')!.textContent).toBe('Entry 1');
    expect(tiles()[0].querySelector('.logbook')!.textContent).toBe('Logbook 1');
  });

  it('asks for one row of tiles', async () => {
    await create([item('1')]);

    expect(repo.listRecentEntries).toHaveBeenCalledWith(anna, RECENT_ENTRY_COUNT);
  });

  it('says when it was edited, year first, and by whom: "you" for the signed-in user', async () => {
    await create([item('1'), item('2', { updatedBy: jon })]);

    const when = tiles().map((t) =>
      t.querySelector('.when')!.textContent!.replace(/\s+/g, ' ').trim(),
    );
    expect(when[0]).toMatch(/^\d{4}-\d{2}-\d{2}|^\w{3} \d+, \d{4}/);
    expect(when[0]).toContain('you');
    expect(when[1]).toContain(jon.name);
  });

  it('calls an untitled entry "Untitled entry"', async () => {
    await create([item('1', { entryTitle: '' })]);

    expect(tiles()[0].querySelector('.entry')!.textContent).toBe('Untitled entry');
  });

  it('shows nothing at all, not even the heading, when there is nothing to continue', async () => {
    await create([]);

    expect(el().querySelector('h2')).toBeNull();
    expect(tiles().length).toBe(0);
  });

  it('waits for the logbooks to load before looking', async () => {
    await create([item('1')], 'loading');

    expect(repo.listRecentEntries).not.toHaveBeenCalled();
    expect(tiles().length).toBe(0);
  });
});
