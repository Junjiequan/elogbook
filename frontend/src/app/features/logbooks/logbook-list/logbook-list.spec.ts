import { BreakpointObserver } from '@angular/cdk/layout';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { TEST_USERS } from '../../../testing/test-users';
import type { Logbook } from '../../../core/models/logbook.models';
import { LogbookRepository } from '../../../core/data-access/logbook.repository';
import { provideFakeAuth } from '../../../testing/fake-auth';
import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MatPaginatorHarness } from '@angular/material/paginator/testing';
import { MatSelectHarness } from '@angular/material/select/testing';
import {
  LIST_VIEW_STORAGE_KEY,
  LogbookList,
  PAGE_SIZE_STORAGE_KEY,
  SEARCH_DEBOUNCE_MS,
  SORT_STORAGE_KEY,
} from './logbook-list';
import { FILTERS, type LogbookFilter } from '../logbook-filters';
import { LogbooksStore } from '../logbooks.store';
import { OWNER_ACCESS, accessFor } from '../../../testing/logbook-fixtures';

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
  members: [{ user: TEST_USERS[0], role: 'owner' }],
  owner: TEST_USERS[0],
  ...OWNER_ACCESS,
  demo: false,
  createdAt: '2026-10-01T10:00:00Z',
  updatedAt: '2026-10-01T10:00:00Z',
});

describe('LogbookList', () => {
  let fixture: ComponentFixture<LogbookList>;
  const el = () => fixture.nativeElement as HTMLElement;
  const titles = () =>
    Array.from(el().querySelectorAll('.card h2, .title-text')).map((n) => n.textContent?.trim());

  const type = async (text: string) => {
    const input = el().querySelector<HTMLInputElement>('input[type="search"]')!;
    input.value = text;
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
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
          provide: LogbookRepository,
          useValue: { listPinnedEntries: () => Promise.resolve([]) },
        },
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

  it('carries a single profile and colour-mode icon in its top-right corner, next to New logbook', () => {
    const actions = el().querySelector('.page-header .page-actions')!;

    expect(actions.querySelectorAll('app-user-controls').length).toBe(1);
    expect(
      actions.querySelector('app-user-controls button.trigger')!.getAttribute('aria-label'),
    ).toBe('Account and appearance');
    expect(actions.textContent).toContain('New logbook');
  });

  it('gives every card a full-width View banner as the way into the logbook', () => {
    const cards = Array.from(el().querySelectorAll<HTMLElement>('.card'));
    expect(cards.length).toBe(3);

    for (const card of cards) {
      const banner = card.querySelector<HTMLAnchorElement>('a.view-banner')!;
      expect(banner.textContent).toContain('View');
      expect(banner.getAttribute('href')).toMatch(/^\/logbooks\/.+/);
      expect(card.querySelectorAll('a').length).toBe(1); // the banner is the only link
      // it spans the card from edge to edge, below the "Updated" line
      const box = card.getBoundingClientRect();
      const bannerBox = banner.getBoundingClientRect();
      expect(Math.round(bannerBox.width)).toBe(Math.round(box.width) - 2); // minus the card's border
      expect(bannerBox.top).toBeGreaterThanOrEqual(
        card.querySelector('.meta')!.getBoundingClientRect().bottom,
      );
    }
    expect(el().querySelector('a.card')).toBeNull(); // the card itself is not a link
  });

  it('marks no text as cut off when everything fits', () => {
    expect(el().querySelector('.card .cut-dots')).toBeNull();
  });

  it('shows the members on each card, in a row of their own and not among the tags', () => {
    for (const card of Array.from(el().querySelectorAll<HTMLElement>('.card'))) {
      const members = card.querySelector('app-member-avatars')!;
      expect(members).not.toBeNull();
      expect(card.querySelector('app-logbook-tags')!.contains(members)).toBe(false);
      expect(card.querySelector('.foot')!.contains(members)).toBe(true);
    }
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

  it('has no tiles of counts: the filters and the pager already say how many there are', () => {
    expect(el().querySelector('.stat')).toBeNull();
    expect(el().querySelector('app-logbook-stats')).toBeNull();
  });

  it('labels the list itself "All logbooks", below the strip and above the search', () => {
    const title = el().querySelector('.section-title')!;

    expect(title.textContent).toBe('All logbooks');
    expect(
      el().querySelector('app-pinned-entries')!.compareDocumentPosition(title) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      title.compareDocumentPosition(el().querySelector('.toolbar')!) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('shows the pinned entries above the search', () => {
    const strip = el().querySelector('app-pinned-entries')!;
    const search = el().querySelector('.toolbar')!;

    expect(strip).not.toBeNull();
    expect(strip.compareDocumentPosition(search) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
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
    Array.from(el().querySelectorAll('.card h2, .title-text')).map((n) => n.textContent?.trim());
  const pager = () => loader.getHarness(MatPaginatorHarness);

  const make = async (count: number) => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideFakeAuth(),
        {
          provide: LogbookRepository,
          useValue: { listPinnedEntries: () => Promise.resolve([]) },
        },
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
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
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

describe('LogbookList toolbar', () => {
  const [anna, jon] = TEST_USERS;
  let fixture: ComponentFixture<LogbookList>;
  const el = () => fixture.nativeElement as HTMLElement;
  const titles = () =>
    Array.from(el().querySelectorAll('.card h2')).map((n) => n.textContent?.trim());
  const books: Logbook[] = [
    {
      ...logbook('1', 'Beta run', 'LoKI', '2026-0412'),
      updatedAt: '2026-10-05T10:00:00Z',
      createdAt: '2026-09-01T10:00:00Z',
    },
    {
      ...logbook('2', 'Alpha scans', 'DREAM', null),
      updatedAt: '2026-10-09T10:00:00Z',
      createdAt: '2026-09-20T10:00:00Z',
    },
    {
      ...logbook('3', 'Gamma notes', null, null),
      updatedAt: '2026-10-07T10:00:00Z',
      createdAt: '2026-09-10T10:00:00Z',
    },
    {
      ...logbook('4', 'Delta shifts', 'LoKI', '2026-0500'),
      updatedAt: '2026-10-01T10:00:00Z',
      createdAt: '2026-09-30T10:00:00Z',
      members: [
        { user: jon, role: 'owner' },
        { user: anna, role: 'viewer' },
      ],
    },
  ];

  const create = async (
    options: {
      narrow?: boolean;
      storedView?: string;
    } = {},
  ) => {
    localStorage.removeItem(SORT_STORAGE_KEY);
    localStorage.removeItem(LIST_VIEW_STORAGE_KEY);
    if (options.storedView) {
      localStorage.setItem(LIST_VIEW_STORAGE_KEY, options.storedView);
    }
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideFakeAuth(anna),
        {
          provide: BreakpointObserver,
          useValue: { observe: () => of({ matches: !!options.narrow, breakpoints: {} }) },
        },
        { provide: LogbookRepository, useValue: { listPinnedEntries: () => Promise.resolve([]) } },
        {
          provide: LogbooksStore,
          useValue: {
            status: signal('ready'),
            load: () => undefined,
            logbooks: signal(books.map((book) => ({ ...book, ...accessFor(book, anna) }))),
          },
        },
      ],
    });
    fixture = TestBed.createComponent(LogbookList);
    await settle();
  };

  const settle = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  const pill = (label: string) =>
    el().querySelector<HTMLButtonElement>(`button.pill[aria-label="${label}"]`)!;
  const menuItems = () =>
    Array.from(
      document.querySelectorAll<HTMLButtonElement>('.mat-mdc-menu-panel button[mat-menu-item]'),
    );
  const choose = async (button: HTMLButtonElement, item: RegExp) => {
    button.click();
    await settle();
    menuItems()
      .find((i) => item.test(i.textContent ?? ''))!
      .click();
    await settle();
  };
  const type = async (text: string) => {
    const input = el().querySelector<HTMLInputElement>('input[type="search"]')!;
    input.value = text;
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    await settle();
  };

  afterEach(() => {
    document.querySelector('.cdk-overlay-backdrop')?.dispatchEvent(new Event('click'));
    localStorage.removeItem(SORT_STORAGE_KEY);
    localStorage.removeItem(LIST_VIEW_STORAGE_KEY);
  });

  describe('the sticky bar', () => {
    const wrap = () => el().querySelector<HTMLElement>('.toolbar-wrap')!;

    it('has no backing at rest, so there is no white rectangle behind the controls', async () => {
      await create();

      expect(wrap().classList).not.toContain('stuck');
      expect(getComputedStyle(wrap()).backgroundColor).toBe('rgba(0, 0, 0, 0)');
      expect(getComputedStyle(wrap()).boxShadow).toBe('none');
    });

    it('gets a backing and an edge only once it has stuck to the top and the page passes under it', async () => {
      let notify: IntersectionObserverCallback = () => undefined;
      const original = window.IntersectionObserver;
      window.IntersectionObserver = class {
        constructor(callback: IntersectionObserverCallback) {
          notify = callback;
        }
        observe() {
          // nothing to watch: the test sends the observer its messages itself
        }
        disconnect() {
          // nothing to release
        }
        unobserve() {
          // nothing to release
        }
        takeRecords() {
          return [];
        }
      } as unknown as typeof IntersectionObserver;
      try {
        await create();
        const scrolledAway = (top: number) =>
          notify(
            [{ isIntersecting: false, boundingClientRect: { top } } as IntersectionObserverEntry],
            {} as IntersectionObserver,
          );

        scrolledAway(-40);
        await settle();
        expect(wrap().classList).toContain('stuck');
        expect(getComputedStyle(wrap()).backgroundColor).not.toBe('rgba(0, 0, 0, 0)');

        notify(
          [{ isIntersecting: true, boundingClientRect: { top: 10 } } as IntersectionObserverEntry],
          {} as IntersectionObserver,
        );
        await settle();
        expect(wrap().classList).not.toContain('stuck');
      } finally {
        window.IntersectionObserver = original;
      }
    });
  });

  describe('sorting', () => {
    it('starts with the most recently updated', async () => {
      await create();

      expect(titles()).toEqual(['Alpha scans', 'Gamma notes', 'Beta run', 'Delta shifts']);
      expect(pill('Sort the logbooks').textContent).toContain('Recently updated');
    });

    it('offers the other orders in a menu, and applies the one chosen', async () => {
      await create();

      await choose(pill('Sort the logbooks'), /Title/);
      expect(titles()).toEqual(['Alpha scans', 'Beta run', 'Delta shifts', 'Gamma notes']);

      await choose(pill('Sort the logbooks'), /Recently created/);
      expect(titles()).toEqual(['Delta shifts', 'Alpha scans', 'Gamma notes', 'Beta run']);

      await choose(pill('Sort the logbooks'), /Instrument/);
      // DREAM, then the two LoKI ones by title, then the logbook with no instrument
      expect(titles()).toEqual(['Alpha scans', 'Beta run', 'Delta shifts', 'Gamma notes']);
    });

    it('marks the chosen order in the menu, and remembers it', async () => {
      await create();
      await choose(pill('Sort the logbooks'), /Title/);

      pill('Sort the logbooks').click();
      await settle();
      const checked = menuItems().filter((i) => i.getAttribute('aria-checked') === 'true');
      expect(checked.map((i) => i.textContent?.replace('check', '').trim())).toEqual([
        'Title (A–Z)',
      ]);
      expect(localStorage.getItem(SORT_STORAGE_KEY)).toBe('title');
    });

    it('applies to the table too, since both show the same list', async () => {
      await create({ storedView: 'table' });
      await choose(pill('Sort the logbooks'), /Title/);

      const rows = Array.from(el().querySelectorAll('tbody .title-text')).map((n) => n.textContent);
      expect(rows).toEqual(['Alpha scans', 'Beta run', 'Delta shifts', 'Gamma notes']);
    });
  });

  describe('searching while typing', () => {
    const keystroke = (text: string) => {
      const input = el().querySelector<HTMLInputElement>('input[type="search"]')!;
      input.value = text;
      input.dispatchEvent(new Event('input'));
    };
    const shown = () => el().querySelectorAll('.cards > li').length;

    // Only timeouts are faked: Angular schedules change detection with an animation frame as well.
    beforeEach(() =>
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] }),
    );
    afterEach(() => vi.useRealTimers());

    it('does not search on every key: it waits for a pause', async () => {
      await create();
      const all = shown();

      for (const text of ['a', 'al', 'alp', 'alpha']) {
        keystroke(text);
        vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS - 50);
      }
      await settle();
      expect(shown()).toBe(all);

      vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
      await settle();
      expect(shown()).toBeLessThan(all);
    });

    it('searches at once on Enter', async () => {
      await create();
      const all = shown();

      keystroke('alpha');
      el()
        .querySelector('input[type="search"]')!
        .dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      await settle();

      expect(shown()).toBeLessThan(all);
    });

    it('lets go of the whole list at once when the box is cleared', async () => {
      await create();
      const all = shown();
      await type('alpha');
      expect(shown()).toBeLessThan(all);

      el().querySelector<HTMLButtonElement>('.search .clear')!.click();
      await settle();

      expect(shown()).toBe(all);
    });
  });

  describe('a toolbar that stays put', () => {
    const box = (e: Element) => {
      const r = e.getBoundingClientRect();
      return [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)];
    };
    const parts = () =>
      ['.search', '.segments', '.pills', '.view-toggle'].map((selector) => ({
        selector,
        box: box(el().querySelector(selector)!),
      }));

    it('keeps every control where it is and as big as it is, whatever is chosen or typed', async () => {
      books.push({
        ...logbook('9', 'Zeta', 'BIFROST'.repeat(8), null),
        updatedAt: '2026-09-01T10:00:00Z',
      });
      try {
        await create();
        const before = parts();
        const pillWidths = Array.from(el().querySelectorAll('.pill')).map((p) => box(p)[2]);

        await choose(pill('Filter by instrument'), /BIFROSTBIFROST/);
        await choose(pill('Sort the logbooks'), /Instrument/);
        await type('zeta');

        expect(parts()).toEqual(before);
        expect(Array.from(el().querySelectorAll('.pill')).map((p) => box(p)[2])).toEqual(
          pillWidths,
        );
      } finally {
        books.pop();
      }
    });

    it('is exactly as wide as the cards beneath it, so a stuck bar does not overhang them', async () => {
      await create();
      const bar = el().querySelector('.toolbar-wrap')!.getBoundingClientRect();
      const cards = el().querySelector('.cards')!.getBoundingClientRect();

      expect(Math.round(bar.left)).toBe(Math.round(cards.left));
      expect(Math.round(bar.width)).toBe(Math.round(cards.width));
    });

    it('never lets one control sit on top of another', async () => {
      await create();
      const rects = parts().map(({ selector, box: [left, top, width, height] }) => ({
        selector,
        left,
        top,
        right: left + width,
        bottom: top + height,
      }));

      for (const [i, a] of rects.entries()) {
        for (const b of rects.slice(i + 1)) {
          const overlap =
            a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
          expect(overlap, `${a.selector} and ${b.selector}`).toBe(false);
        }
      }
    });

    it('cuts a long name with an ellipsis instead of widening the button', async () => {
      books.push({ ...logbook('9', 'Zeta', 'BIFROST'.repeat(8), null) });
      try {
        await create();
        await choose(pill('Filter by instrument'), /BIFROSTBIFROST/);

        const text = pill('Filter by instrument').querySelector<HTMLElement>('.pill-text')!;
        expect(getComputedStyle(text).textOverflow).toBe('ellipsis');
        expect(text.scrollWidth).toBeGreaterThan(text.clientWidth);
        expect(pill('Filter by instrument').getBoundingClientRect().width).toBe(
          pill('Sort the logbooks').getBoundingClientRect().width,
        );
      } finally {
        books.pop();
      }
    });

    it('calls the sort button "Sort: …", so it is not mistaken for the instrument filter', async () => {
      await create();
      await choose(pill('Sort the logbooks'), /Instrument/);

      expect(pill('Sort the logbooks').textContent).toContain('Sort: Instrument');
      expect(pill('Filter by instrument').textContent).toContain('All instruments');
    });
  });

  describe('the instrument filter', () => {
    it('lists the instruments in use, with how many logbooks each has', async () => {
      await create();
      pill('Filter by instrument').click();
      await settle();

      expect(menuItems().map((i) => i.textContent?.replace('check', '').trim())).toEqual([
        'All instruments',
        'DREAM (1)',
        'LoKI (2)',
      ]);
    });

    it('narrows the list to one instrument, says so, and can be cleared', async () => {
      await create();

      await choose(pill('Filter by instrument'), /LoKI/);

      expect(titles()).toEqual(['Beta run', 'Delta shifts']);
      expect(pill('Filter by instrument').textContent).toContain('LoKI');
      expect(pill('Filter by instrument').classList).toContain('active');
      expect(el().querySelector('.result-note')!.textContent).toContain('Showing 2 of 4');

      el().querySelector<HTMLButtonElement>('.clear-all')!.click();
      await settle();
      expect(titles().length).toBe(4);
      expect(el().querySelector('.result-line')).toBeNull();
    });

    it('combines with the role filter and the search', async () => {
      await create();
      await choose(pill('Filter by instrument'), /LoKI/);

      Array.from(el().querySelectorAll<HTMLButtonElement>('.filter'))
        .find((b) => b.textContent?.includes('View only'))!
        .click();
      await settle();
      expect(titles()).toEqual(['Delta shifts']);

      await type('zzz');
      expect(titles()).toEqual([]);
    });
  });

  describe('on a phone', () => {
    it('shows cards only: a table of eight columns cannot fit', async () => {
      await create({ narrow: true });

      expect(el().querySelector('.cards')).not.toBeNull();
      expect(el().querySelector('table')).toBeNull();
    });

    it('ignores a table that was chosen on a bigger screen, and has no layout switch to offer', async () => {
      await create({ narrow: true, storedView: 'table' });

      expect(el().querySelector('table')).toBeNull();
      expect(el().querySelector('.view-toggle')).toBeNull();
      expect(el().querySelector('.slash')).toBeNull(); // nor a keyboard hint
    });

    it('still has the search, the roles, the instrument and the sort', async () => {
      await create({ narrow: true });

      expect(el().querySelector('input[type="search"]')).not.toBeNull();
      expect(el().querySelectorAll('.filter').length).toBe(4);
      expect(pill('Filter by instrument')).not.toBeNull();
      expect(pill('Sort the logbooks')).not.toBeNull();
    });

    it('gets the table back on a wide screen, as chosen', async () => {
      await create({ narrow: false, storedView: 'table' });

      expect(el().querySelector('table')).not.toBeNull();
      expect(el().querySelector('.view-toggle')).not.toBeNull();
    });
  });

  describe('the search', () => {
    const slash = (target: EventTarget = document.body) => {
      const event = new KeyboardEvent('keydown', { key: '/', bubbles: true, cancelable: true });
      target.dispatchEvent(event);
      return event;
    };
    const searchBox = () => el().querySelector<HTMLInputElement>('input[type="search"]')!;

    it('jumps into the search box when "/" is pressed', async () => {
      await create();
      expect(document.activeElement).not.toBe(searchBox());

      const event = slash();

      expect(document.activeElement).toBe(searchBox());
      expect(event.defaultPrevented).toBe(true); // so the slash is not typed into the box
      expect(el().querySelector('.slash')).not.toBeNull(); // and the key is shown as a hint
    });

    it('does not take the key while the user is typing somewhere else', async () => {
      await create();
      const other = document.createElement('input');
      document.body.append(other);
      other.focus();

      const event = slash(other);

      expect(event.defaultPrevented).toBe(false);
      expect(document.activeElement).toBe(other);
      other.remove();
    });

    it('marks the search words in the titles, so it is clear why a logbook matched', async () => {
      await create();

      await type('loki');

      const marks = Array.from(el().querySelectorAll('.card h2 mark')).map((m) => m.textContent);
      expect(el().querySelectorAll('.card').length).toBe(2); // matched by the instrument
      await type('beta');
      expect(Array.from(el().querySelectorAll('.card h2 mark')).map((m) => m.textContent)).toEqual([
        'Beta',
      ]);
      expect(marks).toBeDefined();
    });

    it('says what is filtering and offers a way out when nothing matches', async () => {
      await create();
      await choose(pill('Filter by instrument'), /LoKI/);
      await type('zzz');

      const empty = el().querySelector('.empty')!;
      expect(empty.textContent).toContain('No logbooks match your search or filter.');
      expect(
        Array.from(empty.querySelectorAll('.active-filters li')).map((l) => l.textContent),
      ).toEqual(['Search “zzz”', 'Instrument: LoKI']);

      empty.querySelector<HTMLButtonElement>('button')!.click();
      await settle();
      expect(titles().length).toBe(4);
      expect(searchBox().value).toBe('');
    });
  });

  describe('adding a filter later', () => {
    it('needs only a new entry in the list of filters: the toolbar, the menu and the matching follow', async () => {
      const extra: LogbookFilter = {
        id: 'proposal',
        label: 'Proposal',
        icon: 'description',
        display: 'menu',
        allLabel: 'All proposals',
        options: (logbooks) =>
          [...new Set(logbooks.map((l) => l.proposalId).filter(Boolean))].map((p) => ({
            value: p as string,
            label: p as string,
            count: logbooks.filter((l) => l.proposalId === p).length,
          })),
        matches: (logbook, value) => logbook.proposalId === value,
      };
      (FILTERS as LogbookFilter[]).push(extra);
      try {
        await create();
        expect(pill('Filter by proposal')).not.toBeNull();

        await choose(pill('Filter by proposal'), /2026-0500/);

        expect(titles()).toEqual(['Delta shifts']);
        expect(el().querySelector('.result-note')!.textContent).toContain('Showing 1 of 4');
      } finally {
        (FILTERS as LogbookFilter[]).pop();
      }
    });
  });
});
