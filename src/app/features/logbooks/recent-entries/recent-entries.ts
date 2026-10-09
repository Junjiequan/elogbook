import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, resource } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIcon } from '@angular/material/icon';
import { CurrentUserService } from '../../../core/auth/current-user.service';
import { LogbookRepository } from '../../../core/data-access/logbook.repository';
import { LogbooksStore } from '../logbooks.store';

/** How many entries to offer: one row of tiles. */
export const RECENT_ENTRY_COUNT = 4;

/**
 * "Continue where you left off": the entries edited most recently, across every logbook, each one
 * click from its page. It is what people come back to the list for, which numbers about the list
 * (how many logbooks, how many are yours) are not.
 */
@Component({
  selector: 'app-recent-entries',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, MatIcon, RouterLink],
  templateUrl: './recent-entries.html',
  styleUrl: './recent-entries.scss',
})
export class RecentEntries {
  private readonly repository = inject(LogbookRepository);
  private readonly store = inject(LogbooksStore);
  protected readonly currentUser = inject(CurrentUserService);

  protected readonly recent = resource({
    // Reloads whenever the logbooks do (one was created, shared, deleted).
    params: () =>
      this.store.status() === 'ready'
        ? { user: this.currentUser.user(), logbooks: this.store.logbooks() }
        : undefined,
    loader: ({ params }) => this.repository.listRecentEntries(params.user, RECENT_ENTRY_COUNT),
  });
}
