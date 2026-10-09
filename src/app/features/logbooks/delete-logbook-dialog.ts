import { ChangeDetectionStrategy, Component, inject, resource } from '@angular/core';
import { MatButton } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogTitle,
} from '@angular/material/dialog';
import { LogbookRepository } from '../../core/data-access/logbook.repository';
import type { Logbook } from '../../core/models/logbook.models';

export interface DeleteLogbookDialogData {
  logbook: Logbook;
}

/**
 * Asks "are you sure?" before a logbook is deleted; closes with `true` only on "Yes".
 * Demo logbooks cannot be deleted, so for those it just explains why.
 */
@Component({
  selector: 'app-delete-logbook-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButton, MatDialogActions, MatDialogClose, MatDialogContent, MatDialogTitle],
  template: `
    @if (data.logbook.demo) {
      <h2 mat-dialog-title>Demo cannot be deleted</h2>
      <mat-dialog-content class="content">
        <p>
          <strong>{{ data.logbook.title }}</strong> is a demo logbook. Demo logbooks cannot be
          deleted.
        </p>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-flat-button mat-dialog-close cdkFocusInitial>OK</button>
      </mat-dialog-actions>
    } @else {
      <h2 mat-dialog-title>Are you sure you want to delete this logbook?</h2>
      <mat-dialog-content class="content">
        <p>
          <strong>{{ data.logbook.title }}</strong> will be permanently deleted
          @if (entries.hasValue()) {
            together with its {{ entries.value().length }}
            {{ entries.value().length === 1 ? 'entry' : 'entries' }}
          }
          and their version history. <strong>This cannot be undone.</strong>
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
      width: min(480px, 80vw);
    }
    .danger {
      --mat-button-filled-container-color: var(--mat-sys-error);
      --mat-button-filled-label-text-color: var(--mat-sys-on-error);
    }
  `,
})
export class DeleteLogbookDialog {
  protected readonly data = inject<DeleteLogbookDialogData>(MAT_DIALOG_DATA);
  private readonly repository = inject(LogbookRepository);

  protected readonly entries = resource({
    loader: () => this.repository.listEntries(this.data.logbook.id),
  });
}
