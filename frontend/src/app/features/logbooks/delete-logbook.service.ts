import { inject, Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { firstValueFrom } from 'rxjs';
import type { Logbook } from '../../core/models/logbook.models';
import {
  DeleteLogbookDialog,
  type DeleteLogbookDialogData,
} from './delete-logbook-dialog/delete-logbook-dialog';
import { LogbooksStore } from './logbooks.store';

/** The one way to delete a logbook from the UI: confirm, delete, tell the user. */
@Injectable({ providedIn: 'root' })
export class DeleteLogbook {
  private readonly dialog = inject(MatDialog);
  private readonly store = inject(LogbooksStore);
  private readonly snackBar = inject(MatSnackBar);

  /** Resolves `true` when the logbook was deleted. Demo logbooks only get an explanation. */
  async confirmAndDelete(logbook: Logbook): Promise<boolean> {
    const confirmed = await firstValueFrom(
      this.dialog
        .open<DeleteLogbookDialog, DeleteLogbookDialogData, boolean>(DeleteLogbookDialog, {
          data: { logbook },
        })
        .afterClosed(),
    );
    if (!confirmed) {
      return false;
    }
    try {
      await this.store.delete(logbook.id);
      this.snackBar.open(`Deleted “${logbook.title}”.`, undefined, { duration: 4000 });
      return true;
    } catch {
      this.snackBar.open('Could not delete the logbook.', 'Dismiss', { duration: 6000 });
      return false;
    }
  }
}
