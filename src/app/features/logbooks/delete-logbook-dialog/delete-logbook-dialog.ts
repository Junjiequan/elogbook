import { ChangeDetectionStrategy, Component, inject, resource } from '@angular/core';
import { MatButton } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogTitle,
} from '@angular/material/dialog';
import { LogbookRepository } from '../../../core/data-access/logbook.repository';
import type { Logbook } from '../../../core/models/logbook.models';

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
  templateUrl: './delete-logbook-dialog.html',
  styleUrl: './delete-logbook-dialog.scss',
})
export class DeleteLogbookDialog {
  protected readonly data = inject<DeleteLogbookDialogData>(MAT_DIALOG_DATA);
  private readonly repository = inject(LogbookRepository);

  protected readonly entries = resource({
    loader: () => this.repository.listEntries(this.data.logbook.id),
  });
}
