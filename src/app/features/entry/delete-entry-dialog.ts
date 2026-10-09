import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButton } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogTitle,
} from '@angular/material/dialog';
import type { Entry, Logbook } from '../../core/models/logbook.models';

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
  template: `
    @if (data.logbook.demo) {
      <h2 mat-dialog-title>Demo cannot be deleted</h2>
      <mat-dialog-content class="content">
        <p>
          This entry belongs to the demo logbook <strong>{{ data.logbook.title }}</strong
          >. Demo content cannot be deleted.
        </p>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-flat-button mat-dialog-close cdkFocusInitial>OK</button>
      </mat-dialog-actions>
    } @else {
      <h2 mat-dialog-title>Are you sure you want to delete this entry?</h2>
      <mat-dialog-content class="content">
        <p>
          <strong>{{ data.entry.title || 'Untitled entry' }}</strong> will be permanently deleted
          together with its version history. <strong>This cannot be undone.</strong>
        </p>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <!-- "No" has initial focus so a stray Enter keypress cannot delete anything. -->
        <button mat-button mat-dialog-close cdkFocusInitial>No</button>
        <button mat-flat-button class="danger" [mat-dialog-close]="true">Yes</button>
      </mat-dialog-actions>
    }
  `,
  styles: `
    .content {
      width: min(460px, 80vw);
    }
    .danger {
      --mat-button-filled-container-color: var(--mat-sys-error);
      --mat-button-filled-label-text-color: var(--mat-sys-on-error);
    }
  `,
})
export class DeleteEntryDialog {
  protected readonly data = inject<DeleteEntryDialogData>(MAT_DIALOG_DATA);
}
