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
  templateUrl: './prompt-dialog.html',
  styleUrl: './prompt-dialog.scss',
})
export class PromptDialog {
  protected readonly data = inject<PromptDialogData>(MAT_DIALOG_DATA);
  protected readonly dialogRef = inject<MatDialogRef<PromptDialog, string>>(MatDialogRef);
}
