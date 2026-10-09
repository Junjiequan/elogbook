import { provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DEMO_USERS } from '../../core/data-access/demo/demo-users';
import type { Logbook } from '../../core/models/logbook.models';
import { provideFakeAuth } from '../../testing/fake-auth';
import { LIST_VIEW_STORAGE_KEY, LogbookList } from './logbook-list';
import { LogbooksStore } from './logbooks.store';

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
