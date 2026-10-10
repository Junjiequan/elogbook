import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NoResults } from './no-results';

describe('NoResults', () => {
  const render = (filters: string[]) => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const fixture = TestBed.createComponent(NoResults);
    fixture.componentRef.setInput('filters', filters);
    fixture.detectChanges();
    return fixture;
  };

  it('says nothing matched, and lists what is filtering', () => {
    const el = render(['Search “zzz”', 'Instrument: LoKI']).nativeElement as HTMLElement;

    expect(el.textContent).toContain('No logbooks match your search or filter.');
    expect(Array.from(el.querySelectorAll('.active-filters li')).map((l) => l.textContent)).toEqual(
      ['Search “zzz”', 'Instrument: LoKI'],
    );
  });

  it('offers to clear them, and tells its parent when that is pressed', () => {
    const fixture = render(['Search “zzz”']);
    let cleared = 0;
    fixture.componentInstance.cleared.subscribe(() => cleared++);

    (fixture.nativeElement as HTMLElement).querySelector('button')!.click();

    expect(cleared).toBe(1);
  });
});
