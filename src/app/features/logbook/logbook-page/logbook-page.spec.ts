import { BreakpointObserver } from '@angular/cdk/layout';
import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { DEMO_USERS } from '../../../../demo/demo-users';
import type { Entry, Logbook } from '../../../core/models/logbook.models';
import { provideFakeAuth } from '../../../testing/fake-auth';
import { LogbooksStore } from '../../logbooks/logbooks.store';
import { EntriesStore } from '../entries.store';
import { LogbookPage } from './logbook-page';

@Component({ template: 'stub' })
class Stub {}

const logbook: Logbook = {
  id: 'l1',
  title: 'Test logbook',
  description: '',
  instrument: null,
  proposalId: null,
  visibility: 'private',
  members: [{ user: DEMO_USERS[0], role: 'owner' }],
  createdAt: '2026-10-01T10:00:00Z',
  updatedAt: '2026-10-01T10:00:00Z',
};

describe('LogbookPage sidebar', () => {
  let fixture: ComponentFixture<LogbookPage>;
  const el = () => fixture.nativeElement as HTMLElement;
  const drawer = () => el().querySelector('mat-sidenav') as HTMLElement;
  const click = async (selector: string) => {
    el().querySelector<HTMLButtonElement>(selector)!.click();
    fixture.detectChanges();
    await fixture.whenStable();
  };

  const create = async () => {
    fixture = TestBed.createComponent(LogbookPage);
    fixture.componentRef.setInput('logbookId', 'l1');
    fixture.detectChanges();
    await fixture.whenStable();
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideFakeAuth(),
        {
          provide: BreakpointObserver,
          useValue: { observe: () => of({ matches: false, breakpoints: {} }) },
        },
        {
          provide: LogbooksStore,
          useValue: { logbooks: signal([logbook]), status: signal('ready') },
        },
      ],
    }).overrideComponent(LogbookPage, {
      set: {
        providers: [
          {
            provide: EntriesStore,
            useValue: {
              entries: signal([]),
              status: signal('ready'),
              load: () => undefined,
              create: () => undefined,
            },
          },
        ],
      },
    });
  });

  it('starts open on a wide screen', async () => {
    await create();
    expect(drawer().classList).toContain('mat-drawer-opened');
  });

  it('collapses from the sidebar button, for this visit only', async () => {
    await create();
    await click('button[aria-label="Collapse entry list"]');

    expect(drawer().classList).not.toContain('mat-drawer-opened');

    await create(); // opening a logbook again: the list is back, it is how you reach the content
    expect(drawer().classList).toContain('mat-drawer-opened');
  });

  it('keeps the list closed through the visit once it was closed on purpose', async () => {
    await create();
    await click('button[aria-label="Collapse entry list"]');
    fixture.componentRef.setInput('logbookId', 'l1');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(drawer().classList).not.toContain('mat-drawer-opened');
  });

  it('shows the list again with a tab at the same height as the button that hid it', async () => {
    await create();
    const centreY = (selector: string) => {
      const box = el().querySelector(selector)!.getBoundingClientRect();
      return box.top + box.height / 2;
    };
    const hideY = centreY('button[aria-label="Collapse entry list"]');
    expect(el().querySelector('.edge-tab')).toBeNull();

    await click('button[aria-label="Collapse entry list"]');

    expect(Math.abs(centreY('.edge-tab') - hideY)).toBeLessThan(2);
    expect(el().querySelector('button[aria-label="Toggle entry list"]')).toBeNull(); // the old title-bar button is gone
  });

  it('reopens from the edge tab', async () => {
    await create();
    await click('button[aria-label="Collapse entry list"]');
    expect(drawer().classList).not.toContain('mat-drawer-opened');

    await click('button[aria-label="Show entry list"]');
    expect(drawer().classList).toContain('mat-drawer-opened');
  });

  describe('entry filter', () => {
    const input = () => el().querySelector<HTMLInputElement>('.filter input')!;
    const type = async (text: string) => {
      input().value = text;
      input().dispatchEvent(new Event('input'));
      fixture.detectChanges();
      await fixture.whenStable();
    };

    it('shows a clear button only while there is text, and clears the filter', async () => {
      await create();
      expect(el().querySelector('.filter .clear')).toBeNull();

      await type('runs');
      expect(el().querySelector('.filter .clear')).not.toBeNull();

      await click('.filter .clear');
      expect(input().value).toBe('');
      expect(el().querySelector('.filter .clear')).toBeNull();
    });
  });

  describe('on a phone (the list opens over the page)', () => {
    const entry: Entry = {
      id: 'e1',
      logbookId: 'l1',
      title: 'Tappable entry',
      content: { type: 'doc', content: [] },
      revision: 1,
      createdAt: '2026-10-01T10:00:00Z',
      updatedAt: '2026-10-01T10:00:00Z',
      updatedBy: DEMO_USERS[0],
    };

    it('lets a tap reach an entry instead of the backdrop behind the list', async () => {
      TestBed.overrideProvider(BreakpointObserver, {
        useValue: { observe: () => of({ matches: true, breakpoints: {} }) },
      });
      TestBed.overrideComponent(LogbookPage, {
        set: {
          providers: [
            {
              provide: EntriesStore,
              useValue: {
                entries: signal([entry]),
                status: signal('ready'),
                load: () => undefined,
                create: () => undefined,
              },
            },
          ],
        },
      });
      await create();
      await click('button[aria-label="Show entry list"]');

      const link = el().querySelector<HTMLElement>('.entry-link')!;
      const box = link.getBoundingClientRect();
      const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);

      expect(link.contains(hit)).withContext(`tap landed on ${hit?.className}`).toBeTrue();
    });
  });

  describe('creating entries', () => {
    const addButton = () => el().querySelector('button[aria-label="New entry"]');

    it('puts a compact New entry button next to the filter for people who can write', async () => {
      await create();

      const row = el().querySelector('.search-row');
      expect(row?.querySelector('.filter')).not.toBeNull();
      expect(row?.contains(addButton())).toBeTrue();
      expect(addButton()!.getBoundingClientRect().width).toBeLessThanOrEqual(40);
    });

    it('offers to create the first entry when the logbook is empty', async () => {
      await create();

      expect(el().textContent).toContain('No entries yet.');
      expect(el().textContent).toContain('Create the first entry');
    });

    it('gives an empty entry list no scrollbar', async () => {
      await create();

      const list = el().querySelector<HTMLElement>('.sidenav nav')!;
      expect(list.scrollHeight).toBeLessThanOrEqual(list.clientHeight);
    });

    it('shows neither to someone who can only read', async () => {
      TestBed.overrideProvider(LogbooksStore, {
        useValue: {
          logbooks: signal([
            { ...logbook, members: [{ user: DEMO_USERS[0], role: 'viewer' as const }] },
          ]),
          status: signal('ready'),
        },
      });
      await create();

      expect(addButton()).toBeNull();
      expect(el().textContent).not.toContain('Create the first entry');
    });
  });

  describe('getting back to the list of logbooks', () => {
    it('shows a breadcrumb above the title, which keeps working with the header collapsed', async () => {
      await create();

      const crumbs = el().querySelector('nav[aria-label="Breadcrumb"]')!;
      const link = crumbs.querySelector<HTMLAnchorElement>('a')!;
      expect(link.getAttribute('href')).toBe('/logbooks');
      expect(link.textContent).toContain('Logbooks');
      expect(el().querySelector('.logbook-bar .back')).toBeNull(); // the old button is gone

      const title = el().querySelector('.logbook-bar h1')!;
      expect(crumbs.getBoundingClientRect().bottom).toBeLessThanOrEqual(
        title.getBoundingClientRect().top + 1,
      ); // above the title
      expect(title.textContent).toContain('Test logbook');
      expect(getComputedStyle(crumbs).overflowY).toBe('visible'); // no stray scrollbar next to the title
    });
  });
});

describe('LogbookPage opening a logbook', () => {
  const entry = (id: string): Entry => ({ id, logbookId: 'l1', title: id }) as Entry;

  const open = async (entries: Entry[], url: string) => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([
          { path: 'logbooks/:logbookId', component: Stub },
          { path: 'logbooks/:logbookId/entries/:entryId', component: Stub },
        ]),
        provideFakeAuth(),
        {
          provide: BreakpointObserver,
          useValue: { observe: () => of({ matches: false, breakpoints: {} }) },
        },
        {
          provide: LogbooksStore,
          useValue: { logbooks: signal([logbook]), status: signal('ready') },
        },
      ],
    }).overrideComponent(LogbookPage, {
      set: {
        providers: [
          {
            provide: EntriesStore,
            useValue: {
              entries: signal(entries),
              status: signal('ready'),
              load: () => undefined,
              create: () => undefined,
            },
          },
        ],
      },
    });
    const router = TestBed.inject(Router);
    await router.navigateByUrl(url);
    const fixture = TestBed.createComponent(LogbookPage);
    fixture.componentRef.setInput('logbookId', 'l1');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    await fixture.whenStable();
    return router;
  };

  it('shows the latest entry straight away', async () => {
    const router = await open([entry('newest'), entry('older')], '/logbooks/l1');

    expect(router.url).toBe('/logbooks/l1/entries/newest');
  });

  it('leaves the entry alone when one is already selected', async () => {
    const router = await open([entry('newest'), entry('older')], '/logbooks/l1/entries/older');

    expect(router.url).toBe('/logbooks/l1/entries/older');
  });

  it('stays on the empty page when the logbook has no entries', async () => {
    const router = await open([], '/logbooks/l1');

    expect(router.url).toBe('/logbooks/l1');
  });
});
