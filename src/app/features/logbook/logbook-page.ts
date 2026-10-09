import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { BreakpointObserver } from '@angular/cdk/layout';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatChip } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatSidenav, MatSidenavContainer, MatSidenavContent } from '@angular/material/sidenav';
import { MatTooltip } from '@angular/material/tooltip';
import { map } from 'rxjs';
import { CurrentUserService } from '../../core/auth/current-user.service';
import { canManage, canWrite, roleOf } from '../../core/auth/permissions';
import { ShareDialog, type ShareDialogData } from '../sharing/share-dialog';
import { LogbooksStore } from '../logbooks/logbooks.store';
import { EntriesStore } from './entries.store';

@Component({
  selector: 'app-logbook-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [EntriesStore],
  imports: [
    DatePipe,
    MatButton,
    MatChip,
    MatIcon,
    MatIconButton,
    MatProgressBar,
    MatSidenav,
    MatSidenavContainer,
    MatSidenavContent,
    MatTooltip,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
  ],
  templateUrl: './logbook-page.html',
  styleUrl: './logbook-page.scss',
})
export class LogbookPage {
  readonly logbookId = input.required<string>();

  protected readonly logbooks = inject(LogbooksStore);
  protected readonly entries = inject(EntriesStore);
  private readonly currentUser = inject(CurrentUserService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);

  protected readonly logbook = computed(() =>
    this.logbooks.logbooks().find((l) => l.id === this.logbookId()),
  );
  protected readonly role = computed(() => {
    const logbook = this.logbook();
    return logbook ? roleOf(logbook, this.currentUser.user()) : null;
  });
  protected readonly mayWrite = computed(() => {
    const logbook = this.logbook();
    return !!logbook && canWrite(logbook, this.currentUser.user());
  });

  protected readonly filter = signal('');
  protected readonly visibleEntries = computed(() => {
    const term = this.filter().trim().toLowerCase();
    return term
      ? this.entries.entries().filter((e) => e.title.toLowerCase().includes(term))
      : this.entries.entries();
  });

  protected readonly narrow = toSignal(
    inject(BreakpointObserver)
      .observe('(max-width: 900px)')
      .pipe(map((state) => state.matches)),
    { initialValue: false },
  );
  protected readonly drawerOpen = signal(true);

  constructor() {
    effect(() => {
      const id = this.logbookId();
      untracked(() => void this.entries.load(id));
    });
    effect(() => this.drawerOpen.set(!this.narrow()));
  }

  protected async newEntry(): Promise<void> {
    const entry = await this.entries.create(this.logbookId());
    await this.router.navigate(['/logbooks', this.logbookId(), 'entries', entry.id]);
  }

  protected setFilter(event: Event): void {
    this.filter.set((event.target as HTMLInputElement).value);
  }

  protected entryOpened(): void {
    if (this.narrow()) {
      this.drawerOpen.set(false);
    }
  }

  protected openSharing(): void {
    const logbook = this.logbook();
    if (logbook) {
      this.dialog.open<ShareDialog, ShareDialogData>(ShareDialog, {
        data: { logbook, canManage: canManage(logbook, this.currentUser.user()) },
      });
    }
  }
}
