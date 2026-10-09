import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButton } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogRef,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogTitle,
} from '@angular/material/dialog';
import { MatFormField, MatHint, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';

export interface PromptDialogData {
  title: string;
  label: string;
  value?: string;
  confirmLabel?: string;
  hint?: string;
}

/** Asks for one line of text. Closes with the entered string, or `undefined` when cancelled. */
@Component({
  selector: 'app-prompt-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatButton,
    MatDialogActions,
    MatDialogClose,
    MatDialogContent,
    MatDialogTitle,
    MatFormField,
    MatHint,
    MatInput,
    MatLabel,
  ],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content>
      <mat-form-field class="full-width">
        <mat-label>{{ data.label }}</mat-label>
        <input
          matInput
          #field
          cdkFocusInitial
          [value]="data.value ?? ''"
          (keydown.enter)="dialogRef.close(field.value)"
        />
        @if (data.hint) {
          <mat-hint>{{ data.hint }}</mat-hint>
        }
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-flat-button [mat-dialog-close]="field.value">
        {{ data.confirmLabel ?? 'OK' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .full-width {
      width: min(480px, 80vw);
    }
  `,
})
export class PromptDialog {
  protected readonly data = inject<PromptDialogData>(MAT_DIALOG_DATA);
  protected readonly dialogRef = inject<MatDialogRef<PromptDialog, string>>(MatDialogRef);
}
