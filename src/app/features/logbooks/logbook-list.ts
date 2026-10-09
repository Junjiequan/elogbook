import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatButton } from '@angular/material/button';
import { MatChip } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { MatProgressBar } from '@angular/material/progress-bar';
import { firstValueFrom } from 'rxjs';
import { CurrentUserService } from '../../core/auth/current-user.service';
import { roleOf } from '../../core/auth/permissions';
import type { Logbook, NewLogbook } from '../../core/models/logbook.models';
import { NewLogbookDialog } from './new-logbook-dialog';
import { LogbooksStore } from './logbooks.store';

@Component({
  selector: 'app-logbook-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, MatButton, MatChip, MatIcon, MatProgressBar, RouterLink],
  templateUrl: './logbook-list.html',
  styleUrl: './logbook-list.scss',
})
export class LogbookList {
  protected readonly store = inject(LogbooksStore);
  private readonly currentUser = inject(CurrentUserService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);

  protected roleLabel(logbook: Logbook): string {
    return roleOf(logbook, this.currentUser.user()) ?? '';
  }

  protected async create(): Promise<void> {
    const input = await firstValueFrom(
      this.dialog.open<NewLogbookDialog, void, NewLogbook>(NewLogbookDialog).afterClosed(),
    );
    if (input) {
      const logbook = await this.store.create(input);
      await this.router.navigate(['/logbooks', logbook.id]);
    }
  }
}
