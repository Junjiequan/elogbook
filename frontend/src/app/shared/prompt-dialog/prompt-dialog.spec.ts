import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { PromptDialog, type PromptDialogData } from './prompt-dialog';

describe('PromptDialog', () => {
  const create = (data: PromptDialogData) => {
    const ref = {
      close: vi.fn().mockName('MatDialogRef.close'),
    };
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: MatDialogRef, useValue: ref },
      ],
    });
    const fixture = TestBed.createComponent(PromptDialog);
    fixture.detectChanges();
    return { ref, el: fixture.nativeElement as HTMLElement };
  };

  const input = (el: HTMLElement) => el.querySelector('input')!;

  it('shows the title, the label, the current value and the hint', () => {
    const { el } = create({
      title: 'Rename entry',
      label: 'Title',
      value: 'Day 1',
      hint: 'Shown in the list',
    });

    expect(el.querySelector('h2')!.textContent).toContain('Rename entry');
    expect(el.textContent).toContain('Title');
    expect(input(el).value).toBe('Day 1');
    expect(el.textContent).toContain('Shown in the list');
  });

  it('starts empty when there is no value, and the button says OK by default', () => {
    const { el } = create({ title: 'Link', label: 'Address' });

    expect(input(el).value).toBe('');
    expect(el.querySelector('mat-dialog-actions button:last-child')!.textContent?.trim()).toBe(
      'OK',
    );
  });

  it('uses the given label for the confirm button', () => {
    const { el } = create({ title: 'Link', label: 'Address', confirmLabel: 'Insert' });

    expect(el.querySelector('mat-dialog-actions button:last-child')!.textContent?.trim()).toBe(
      'Insert',
    );
  });

  it('closes with the typed text when Enter is pressed', () => {
    const { ref, el } = create({ title: 'Link', label: 'Address' });
    input(el).value = 'https://example.org';

    input(el).dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

    expect(ref.close).toHaveBeenCalledTimes(1);

    expect(ref.close).toHaveBeenCalledWith('https://example.org');
  });
});
