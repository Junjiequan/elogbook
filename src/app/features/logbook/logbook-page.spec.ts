import { BreakpointObserver } from '@angular/cdk/layout';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { DEMO_USERS } from '../../core/data-access/demo/demo-users';
import type { Entry, Logbook } from '../../core/models/logbook.models';
import { provideFakeAuth } from '../../testing/fake-auth';
import { LogbooksStore } from '../logbooks/logbooks.store';
import { EntriesStore } from './entries.store';
import { MatSidenav } from '@angular/material/sidenav';
import { By } from '@angular/platform-browser';
import { LogbookPage, SIDEBAR_COLLAPSED_KEY } from './logbook-page';

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
    localStorage.removeItem(SIDEBAR_COLLAPSED_KEY);
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

  afterEach(() => localStorage.removeItem(SIDEBAR_COLLAPSED_KEY));

  it('starts open on a wide screen', async () => {
    await create();
    expect(drawer().classList).toContain('mat-drawer-opened');
  });

  it('collapses from the sidebar button and remembers it', async () => {
    await create();
    await click('button[aria-label="Collapse entry list"]');

    expect(drawer().classList).not.toContain('mat-drawer-opened');
    expect(localStorage.getItem(SIDEBAR_COLLAPSED_KEY)).toBe('true');

    await create();
    expect(drawer().classList).not.toContain('mat-drawer-opened');
  });

  it('does not remember a close it did not cause, such as the panel closing while the window is resized', async () => {
    await create();
    fixture.debugElement.query(By.directive(MatSidenav)).componentInstance.close();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(localStorage.getItem(SIDEBAR_COLLAPSED_KEY)).not.toBe('true');
  });

  it('reopens from the menu button', async () => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, 'true');
    await create();
    expect(drawer().classList).not.toContain('mat-drawer-opened');

    await click('button[aria-label="Toggle entry list"]');
    expect(drawer().classList).toContain('mat-drawer-opened');
    expect(localStorage.getItem(SIDEBAR_COLLAPSED_KEY)).toBe('false');
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
      await click('button[aria-label="Toggle entry list"]');

      const link = el().querySelector<HTMLElement>('.entry-link')!;
      const box = link.getBoundingClientRect();
      const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);

      expect(link.contains(hit)).withContext(`tap landed on ${hit?.className}`).toBeTrue();
    });
  });
});
