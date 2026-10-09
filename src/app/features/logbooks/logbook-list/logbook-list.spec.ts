import { provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DEMO_USERS } from '../../../demo/demo-users';
import type { Logbook } from '../../../core/models/logbook.models';
import { provideFakeAuth } from '../../../testing/fake-auth';
import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MatPaginatorHarness } from '@angular/material/paginator/testing';
import { MatSelectHarness } from '@angular/material/select/testing';
import { LIST_VIEW_STORAGE_KEY, LogbookList, PAGE_SIZE_STORAGE_KEY } from './logbook-list';
import { LogbooksStore } from '../logbooks.store';

const logbook = (
  id: string,
  title: string,
  instrument: string | null,
  proposalId: string | null,
): Logbook => ({
  id,
  title,
  description: '',
  instrument,
  proposalId,
  visibility: 'private',
  members: [{ user: DEMO_USERS[0], role: 'owner' }],
  createdAt: '2026-10-01T10:00:00Z',
  updatedAt: '2026-10-01T10:00:00Z',
});

describe('LogbookList', () => {
  let fixture: ComponentFixture<LogbookList>;
  const el = () => fixture.nativeElement as HTMLElement;
  const titles = () =>
    Array.from(el().querySelectorAll('.card h2, .title-cell a')).map((n) => n.textContent?.trim());

  const type = async (text: string) => {
    const input = el().querySelector<HTMLInputElement>('input[type="search"]')!;
    input.value = text;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
  };

  beforeEach(async () => {
    localStorage.removeItem(LIST_VIEW_STORAGE_KEY);
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideFakeAuth(),
        {
          provide: LogbooksStore,
          useValue: {
            status: signal('ready'),
            load: () => undefined,
            logbooks: signal([
              logbook('1', 'LoKI beamtime', 'LoKI', '2026-0412'),
              logbook('2', 'Reflectometry run', 'ESTIA', '2026-0377'),
              logbook('3', 'Battery cathode', 'DREAM', null),
            ]),
          },
        },
      ],
    });
    fixture = TestBed.createComponent(LogbookList);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach(() => localStorage.removeItem(LIST_VIEW_STORAGE_KEY));

  it('shows every logbook as a card by default', () => {
    expect(titles()).toEqual(['LoKI beamtime', 'Reflectometry run', 'Battery cathode']);
    expect(el().querySelector('table')).toBeNull();
  });

  it('searches title, instrument and proposal, matching every word', async () => {
    await type('estia');
    expect(titles()).toEqual(['Reflectometry run']);

    await type('0412 loki');
    expect(titles()).toEqual(['LoKI beamtime']);

    await type('0412 estia');
    expect(titles()).toEqual([]);
    expect(el().textContent).toContain('No logbooks match');
  });

  it('switches to a compact table and remembers the choice', async () => {
    const toggle = el().querySelector<HTMLButtonElement>(
      'mat-button-toggle[value="table"] button',
    )!;
    toggle.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(el().querySelectorAll('tbody tr').length).toBe(3);
    expect(localStorage.getItem(LIST_VIEW_STORAGE_KEY)).toBe('table');
  });

  it('summarises the logbooks in overview tiles', () => {
    const tiles = Array.from(el().querySelectorAll('.stat')).map((t) =>
      t.textContent?.replace(/\s+/g, ' ').trim(),
    );
    expect(tiles[0]).toContain('3');
    expect(tiles[0]).toContain('Logbooks');
    expect(tiles[1]).toContain('Owned by me');
  });

  it('filters by the role the user has', async () => {
    const chip = (label: string) =>
      Array.from(el().querySelectorAll<HTMLButtonElement>('.filter')).find((b) =>
        b.textContent?.includes(label),
      )!;

    chip('View only').click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(titles()).toEqual([]);

    chip('Owned by me').click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(titles().length).toBe(3);
    expect(chip('Owned by me').getAttribute('aria-pressed')).toBe('true');
  });
});

describe('LogbookList pagination', () => {
  let fixture: ComponentFixture<LogbookList>;
  let loader: HarnessLoader;
  const el = () => fixture.nativeElement as HTMLElement;
  const titles = () =>
    Array.from(el().querySelectorAll('.card h2, .title-cell a')).map((n) => n.textContent?.trim());
  const pager = () => loader.getHarness(MatPaginatorHarness);

  const make = async (count: number) => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideFakeAuth(),
        {
          provide: LogbooksStore,
          useValue: {
            status: signal('ready'),
            load: () => undefined,
            logbooks: signal(
              Array.from({ length: count }, (_, i) =>
                logbook(String(i + 1), `Logbook ${String(i + 1).padStart(2, '0')}`, null, null),
              ),
            ),
          },
        },
      ],
    });
    fixture = TestBed.createComponent(LogbookList);
    fixture.detectChanges();
    await fixture.whenStable();
    loader = TestbedHarnessEnvironment.loader(fixture);
  };

  const type = async (text: string) => {
    const input = el().querySelector<HTMLInputElement>('input[type="search"]')!;
    input.value = text;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
  };

  beforeEach(() => {
    localStorage.removeItem(PAGE_SIZE_STORAGE_KEY);
    localStorage.removeItem(LIST_VIEW_STORAGE_KEY);
  });

  afterEach(() => {
    localStorage.removeItem(PAGE_SIZE_STORAGE_KEY);
    localStorage.removeItem(LIST_VIEW_STORAGE_KEY);
  });

  it('shows the first 10 by default and offers only 10 or 25 per page', async () => {
    await make(12);

    expect(titles().length).toBe(10);
    expect(titles()[0]).toBe('Logbook 01');
    const harness = await pager();
    expect(await harness.getPageSize()).toBe(10);
    expect(await harness.getRangeLabel()).toBe('1 – 10 of 12');
    const select = await loader.getHarness(MatSelectHarness);
    await select.open();
    expect(await Promise.all((await select.getOptions()).map((o) => o.getText()))).toEqual([
      '10',
      '25',
    ]);
  });

  it('shows no pager when everything fits on one page', async () => {
    await make(10);
    expect(el().querySelector('mat-paginator')).toBeNull();
    expect(titles().length).toBe(10);

    await make(11);
    expect(el().querySelector('mat-paginator')).not.toBeNull();
  });

  it('keeps the pager when 25 per page is chosen and fewer results are left', async () => {
    await make(30);
    await (await pager()).setPageSize(25);

    await type('logbook 2'); // 12 matches: one page, but the page size can still be changed back
    expect(await (await pager()).getRangeLabel()).toBe('1 – 12 of 12');
  });

  it('only says "Showing x of y" when a search or filter hides some logbooks', async () => {
    await make(11);
    expect(el().querySelector('.result-note')).toBeNull();

    await type('Logbook 05');
    expect(el().querySelector('.result-note')?.textContent?.trim()).toBe('Showing 1 of 11');
  });

  it('moves between pages', async () => {
    await make(12);
    const harness = await pager();

    await harness.goToNextPage();
    expect(titles()).toEqual(['Logbook 11', 'Logbook 12']);
    expect(await harness.getRangeLabel()).toBe('11 – 12 of 12');

    await harness.goToPreviousPage();
    expect(titles().length).toBe(10);
  });

  it('paginates the table the same way as the cards', async () => {
    localStorage.setItem(LIST_VIEW_STORAGE_KEY, 'table');
    await make(12);

    expect(el().querySelectorAll('tbody tr').length).toBe(10);
    // the pager is the footer of the table, not a separate box below it
    expect(el().querySelector('app-logbook-table mat-paginator')).not.toBeNull();
    await (await pager()).goToNextPage();
    expect(el().querySelectorAll('tbody tr').length).toBe(2);
  });

  it('lets you show 25 per page, and remembers it', async () => {
    await make(30);
    const harness = await pager();

    await harness.setPageSize(25);

    expect(titles().length).toBe(25);
    expect(await harness.getRangeLabel()).toBe('1 – 25 of 30');
    expect(localStorage.getItem(PAGE_SIZE_STORAGE_KEY)).toBe('25');

    await make(30); // a fresh visit
    expect(titles().length).toBe(25);
  });

  it('goes back to the first page when the search or filter changes', async () => {
    await make(30);
    await (await pager()).goToNextPage();
    expect(titles()[0]).toBe('Logbook 11');

    await type('logbook');

    expect(titles()[0]).toBe('Logbook 01');
    expect(await (await pager()).getRangeLabel()).toBe('1 – 10 of 30');
  });

  it('counts only the logbooks that match the search', async () => {
    await make(30);

    await type('Logbook 29');
    expect(titles()).toEqual(['Logbook 29']);

    // Words are matched separately, so "2" also finds 02, 12 and 20–29.
    await type('logbook 2');
    expect(await (await pager()).getRangeLabel()).toBe('1 – 10 of 12');
  });
});
