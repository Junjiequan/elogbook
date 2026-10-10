import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButton } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogTitle,
} from '@angular/material/dialog';
import type { Entry, Logbook } from '../../../core/models/logbook.models';

export interface DeleteEntryDialogData {
  entry: Entry;
  logbook: Logbook;
}

/**
 * Asks "are you sure?" before an entry is deleted; closes with `true` only on "Yes".
 * Entries of a demo logbook cannot be deleted, so for those it just explains why.
 */
@Component({
  selector: 'app-delete-entry-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButton, MatDialogActions, MatDialogClose, MatDialogContent, MatDialogTitle],
  templateUrl: './delete-entry-dialog.html',
  styleUrl: './delete-entry-dialog.scss',
})
export class DeleteEntryDialog {
  protected readonly data = inject<DeleteEntryDialogData>(MAT_DIALOG_DATA);
}
