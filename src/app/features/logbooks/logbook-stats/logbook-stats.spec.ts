import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { LogbookStats, type LogbookStatsData } from './logbook-stats';

describe('LogbookStats', () => {
  const render = (data: LogbookStatsData) => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const fixture = TestBed.createComponent(LogbookStats);
    fixture.componentRef.setInput('data', data);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  const tiles = (el: HTMLElement) =>
    Array.from(el.querySelectorAll('.stat')).map((tile) =>
      [
        tile.querySelector('strong')!.textContent,
        tile.querySelector('.text span')!.textContent,
      ].map((t) => t?.trim()),
    );

  it('shows the totals, what is yours and what is shared', () => {
    const el = render({ total: 7, owned: 4, shared: 3, latest: '2026-10-09T08:46:00Z' });

    expect(tiles(el)).toEqual([
      ['7', 'Logbooks'],
      ['4', 'Owned by me'],
      ['3', 'Shared with me'],
      ['2026-10-09', 'Last activity'],
    ]);
  });

  it('shows no date when there has been no activity', () => {
    const el = render({ total: 0, owned: 0, shared: 0, latest: null });

    expect(tiles(el)[3][0]).toBe('');
  });
});
