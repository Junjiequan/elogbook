import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ConfirmDialog, type ConfirmDialogData } from './confirm-dialog';

describe('ConfirmDialog', () => {
  let fixture: ComponentFixture<ConfirmDialog>;
  const el = () => fixture.nativeElement as HTMLElement;
  const buttons = () => Array.from(el().querySelectorAll<HTMLButtonElement>('button'));

  const create = async (data: ConfirmDialogData) => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: MatDialogRef, useValue: { close: () => undefined } },
      ],
    });
    fixture = TestBed.createComponent(ConfirmDialog);
    fixture.detectChanges();
    await fixture.whenStable();
  };

  it('asks its question, with No and a Yes', async () => {
    await create({ title: 'Remove them?', message: 'They will be gone.' });

    expect(el().querySelector('h2')!.textContent).toContain('Remove them?');
    expect(el().textContent).toContain('They will be gone.');
    expect(buttons().map((b) => b.textContent?.trim())).toEqual(['No', 'Yes']);
  });

  it('can name the confirming button and warn that it is dangerous', async () => {
    await create({ title: 'T', message: 'M', confirmLabel: 'Remove', danger: true });

    const confirm = buttons()[1];
    expect(confirm.textContent?.trim()).toBe('Remove');
    expect(confirm.classList).toContain('danger');
  });

  it('puts the focus on No, so a stray Enter cannot confirm anything', async () => {
    await create({ title: 'T', message: 'M' });

    expect(buttons()[0].hasAttribute('cdkFocusInitial')).toBe(true);
  });
});
