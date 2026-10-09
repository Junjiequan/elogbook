import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NoEntrySelected } from './no-entry-selected';

describe('NoEntrySelected', () => {
  it('tells the user to select an entry or create one', () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const fixture = TestBed.createComponent(NoEntrySelected);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Select an entry, or create a new one.');
    expect(el.querySelector('mat-icon')).not.toBeNull();
  });
});
