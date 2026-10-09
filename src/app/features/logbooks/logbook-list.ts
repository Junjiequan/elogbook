import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatButtonToggle, MatButtonToggleGroup } from '@angular/material/button-toggle';
import { MatChip } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatTooltip } from '@angular/material/tooltip';
import { firstValueFrom } from 'rxjs';
import { CurrentUserService } from '../../core/auth/current-user.service';
import { roleOf } from '../../core/auth/permissions';
import type { Logbook, MemberRole, NewLogbook } from '../../core/models/logbook.models';
import { LogbookStats } from './logbook-stats';
import { LogbookTable } from './logbook-table';
import { NewLogbookDialog } from './new-logbook-dialog';
import { LogbooksStore } from './logbooks.store';

export type ListView = 'cards' | 'table';
export type RoleFilter = 'all' | MemberRole;

export const LIST_VIEW_STORAGE_KEY = 'elogbook.logbookListView';

@Component({
  selector: 'app-logbook-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    LogbookStats,
    LogbookTable,
    MatButton,
    MatButtonToggle,
    MatButtonToggleGroup,
    MatChip,
    MatIcon,
    MatIconButton,
    MatProgressBar,
    MatTooltip,
    RouterLink,
  ],
  templateUrl: './logbook-list.html',
  styleUrl: './logbook-list.scss',
})
export class LogbookList {
  protected readonly store = inject(LogbooksStore);
  private readonly currentUser = inject(CurrentUserService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);

  protected readonly query = signal('');
  protected readonly roleFilter = signal<RoleFilter>('all');
  protected readonly view = signal<ListView>(this.readStoredView());

  protected readonly roleFilters: { value: RoleFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'owner', label: 'Owned by me' },
    { value: 'editor', label: 'I can edit' },
    { value: 'viewer', label: 'View only' },
  ];

  /** Overview numbers for the tiles; always about every logbook, not the filtered view. */
  protected readonly stats = computed(() => {
    const all = this.store.logbooks();
    const owned = all.filter((l) => this.roleLabel(l) === 'owner').length;
    const latest =
      all
        .map((l) => l.updatedAt)
        .sort()
        .at(-1) ?? null;
    return { total: all.length, owned, shared: all.length - owned, latest };
  });

  protected readonly roleCounts = computed(() => {
    const counts: Record<RoleFilter, number> = { all: 0, owner: 0, editor: 0, viewer: 0 };
    for (const logbook of this.store.logbooks()) {
      counts.all++;
      const role = this.roleLabel(logbook);
      if (role) {
        counts[role]++;
      }
    }
    return counts;
  });

  /** Logbooks matching the role filter and every word of the search box. */
  protected readonly visible = computed(() => {
    const words = this.query().toLowerCase().split(/\s+/).filter(Boolean);
    const filter = this.roleFilter();
    return this.store.logbooks().filter((logbook) => {
      if (filter !== 'all' && this.roleLabel(logbook) !== filter) {
        return false;
      }
      const haystack = [logbook.title, logbook.description, logbook.instrument, logbook.proposalId]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return words.every((word) => haystack.includes(word));
    });
  });

  constructor() {
    effect(() => {
      const view = this.view();
      try {
        localStorage.setItem(LIST_VIEW_STORAGE_KEY, view);
      } catch {
        // storage unavailable: the choice just won't survive a reload
      }
    });
  }

  protected roleLabel(logbook: Logbook): MemberRole | '' {
    return roleOf(logbook, this.currentUser.user()) ?? '';
  }

  protected setQuery(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
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

  private readStoredView(): ListView {
    try {
      return localStorage.getItem(LIST_VIEW_STORAGE_KEY) === 'table' ? 'table' : 'cards';
    } catch {
      return 'cards';
    }
  }
}
