import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { firstValueFrom } from 'rxjs';
import {
  ConfirmDialog,
  type ConfirmDialogData,
} from '../../../shared/confirm-dialog/confirm-dialog';
import { SampleLogbooks } from './sample-logbooks.service';

/**
 * One button that adds the sample logbooks, or (once you have them) removes them again. Nothing is
 * shown when the server has sample logbooks switched off.
 */
@Component({
  selector: 'app-sample-logbooks',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButton, MatIcon],
  templateUrl: './sample-logbooks.html',
  styleUrl: './sample-logbooks.scss',
})
export class SampleLogbooksButton {
  protected readonly samples = inject(SampleLogbooks);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  protected async toggle(): Promise<void> {
    if (this.samples.count() === 0) {
      await this.run(() => this.samples.add(), 'Sample logbooks added.');
      return;
    }
    const confirmed = await firstValueFrom(
      this.dialog
        .open<ConfirmDialog, ConfirmDialogData, boolean>(ConfirmDialog, {
          data: {
            title: 'Remove the sample logbooks?',
            message:
              'The sample logbooks and their entries and version history will be deleted. Your own logbooks are not touched.',
            confirmLabel: 'Remove',
            danger: true,
          },
        })
        .afterClosed(),
    );
    if (confirmed) {
      await this.run(() => this.samples.remove(), 'Sample logbooks removed.');
    }
  }

  private async run(action: () => Promise<void>, done: string): Promise<void> {
    try {
      await action();
      this.snackBar.open(done, undefined, { duration: 3000 });
    } catch {
      this.snackBar.open('That did not work. Try again.', 'Dismiss', { duration: 6000 });
    }
  }
}
