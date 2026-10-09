import { DatePipe, NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatButtonToggle, MatButtonToggleGroup } from '@angular/material/button-toggle';
import { MatDialog } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { MatPaginator, type PageEvent } from '@angular/material/paginator';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatTooltip } from '@angular/material/tooltip';
import { firstValueFrom } from 'rxjs';
import { CurrentUserService } from '../../core/auth/current-user.service';
import { roleOf } from '../../core/auth/permissions';
import type { Logbook, MemberRole, NewLogbook } from '../../core/models/logbook.models';
import { LogbookTags } from '../../shared/logbook-tags/logbook-tags';
import { LogbookStats } from './logbook-stats';
import { LogbookTable } from './logbook-table';
import { NewLogbookDialog } from './new-logbook-dialog';
import { LogbooksStore } from './logbooks.store';

export type ListView = 'cards' | 'table';
export type RoleFilter = 'all' | MemberRole;

export const LIST_VIEW_STORAGE_KEY = 'elogbook.logbookListView';
export const PAGE_SIZE_STORAGE_KEY = 'elogbook.logbookPageSize';

export const PAGE_SIZES = [10, 25] as const;
const DEFAULT_PAGE_SIZE = PAGE_SIZES[0];

@Component({
  selector: 'app-logbook-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    LogbookStats,
    LogbookTags,
    LogbookTable,
    MatButton,
    MatButtonToggle,
    MatButtonToggleGroup,
    MatIcon,
    MatIconButton,
    MatPaginator,
    MatProgressBar,
    MatTooltip,
    NgTemplateOutlet,
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
  protected readonly pageSizes = PAGE_SIZES;
  protected readonly pageSize = signal<number>(this.readStoredPageSize());
  private readonly requestedPage = signal(0);

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

  /** The page being shown. Kept inside the valid range, e.g. after a search leaves fewer results. */
  protected readonly pageIndex = computed(() => {
    const lastPage = Math.max(0, Math.ceil(this.visible().length / this.pageSize()) - 1);
    return Math.min(this.requestedPage(), lastPage);
  });

  /** The logbooks on the current page, for both the cards and the table. */
  protected readonly pageItems = computed(() => {
    const start = this.pageIndex() * this.pageSize();
    return this.visible().slice(start, start + this.pageSize());
  });

  /**
   * The pager only appears when there is more than the smallest page size to show: "9 of 9" says
   * nothing, and with 10 or fewer logbooks there is nothing to page through.
   */
  protected readonly showPager = computed(() => this.visible().length > PAGE_SIZES[0]);

  constructor() {
    // A new search or filter starts again from the first page.
    effect(() => {
      this.query();
      this.roleFilter();
      untracked(() => this.requestedPage.set(0));
    });

    effect(() => {
      const size = this.pageSize();
      try {
        localStorage.setItem(PAGE_SIZE_STORAGE_KEY, String(size));
      } catch {
        // storage unavailable: the choice just won't survive a reload
      }
    });

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

  protected changePage(event: PageEvent): void {
    if (event.pageSize !== this.pageSize()) {
      this.pageSize.set(event.pageSize);
      this.requestedPage.set(0); // a different page size makes the old page number meaningless
    } else {
      this.requestedPage.set(event.pageIndex);
    }
  }

  private readStoredPageSize(): number {
    try {
      const stored = Number(localStorage.getItem(PAGE_SIZE_STORAGE_KEY));
      return (PAGE_SIZES as readonly number[]).includes(stored) ? stored : DEFAULT_PAGE_SIZE;
    } catch {
      return DEFAULT_PAGE_SIZE;
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
