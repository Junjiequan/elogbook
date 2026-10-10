import { BreakpointObserver } from '@angular/cdk/layout';
import { NgTemplateOutlet } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatButtonToggle, MatButtonToggleGroup } from '@angular/material/button-toggle';
import { MatDialog } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import type { PageEvent } from '@angular/material/paginator';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatTooltip } from '@angular/material/tooltip';
import { firstValueFrom, map } from 'rxjs';
import type { Logbook, MemberRole, NewLogbook } from '../../../core/models/logbook.models';
import {
  DEFAULT_SORT,
  FILTERS,
  SORTS,
  type FilterContext,
  type FilterOption,
  type LogbookFilter,
} from '../logbook-filters';
import { UserControls } from '../../../shared/user-controls/user-controls';
import { LogbookCard } from '../logbook-card/logbook-card';
import { NoResults } from '../no-results/no-results';
import { PinnedEntries } from '../pinned-entries/pinned-entries';
import { SampleLogbooksButton } from '../sample-logbooks/sample-logbooks';
import { LogbookPager } from '../logbook-pager/logbook-pager';
import { LogbookTable } from '../logbook-table/logbook-table';
import { NewLogbookDialog } from '../new-logbook-dialog/new-logbook-dialog';
import { LogbooksStore } from '../logbooks.store';

export type ListView = 'cards' | 'table';

export const LIST_VIEW_STORAGE_KEY = 'elogbook.logbookListView';
export const PAGE_SIZE_STORAGE_KEY = 'elogbook.logbookPageSize';
export const SORT_STORAGE_KEY = 'elogbook.logbookSort';

/**
 * How long the search box waits after the last keystroke before it searches. The search will be a
 * request to the backend, so it must not fire on every key.
 */
export const SEARCH_DEBOUNCE_MS = 300;

export const PAGE_SIZES = [10, 25] as const;
const DEFAULT_PAGE_SIZE = PAGE_SIZES[0];

/** Below this width the list is cards only: a table of eight columns cannot fit a phone. */
export const NARROW_QUERY = '(max-width: 700px)';

/** Which option each filter has chosen (by filter id); a filter that is absent or `null` is off. */
export type FilterValues = Readonly<Record<string, string | null>>;

/** The nearest ancestor that scrolls, or `null` when the window does. */
function scrollParent(element: HTMLElement): HTMLElement | null {
  for (let parent = element.parentElement; parent; parent = parent.parentElement) {
    if (/auto|scroll/.test(getComputedStyle(parent).overflowY)) {
      return parent;
    }
  }
  return null;
}

@Component({
  selector: 'app-logbook-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    LogbookCard,
    LogbookPager,
    LogbookTable,
    MatButton,
    MatButtonToggle,
    MatButtonToggleGroup,
    MatIcon,
    MatIconButton,
    MatMenu,
    MatMenuItem,
    MatMenuTrigger,
    MatProgressBar,
    MatTooltip,
    NgTemplateOutlet,
    NoResults,
    PinnedEntries,
    SampleLogbooksButton,
    UserControls,
  ],
  templateUrl: './logbook-list.html',
  styleUrl: './logbook-list.scss',
  host: { '(document:keydown)': 'focusSearchOnSlash($event)' },
})
export class LogbookList {
  protected readonly store = inject(LogbooksStore);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);

  protected readonly narrow = toSignal(
    inject(BreakpointObserver)
      .observe(NARROW_QUERY)
      .pipe(map((state) => state.matches)),
    { initialValue: false },
  );
  private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');
  private readonly sentinel = viewChild<ElementRef<HTMLElement>>('stuckSentinel');
  /** True once the toolbar has scrolled up to the top edge and stuck there. */
  protected readonly stuck = signal(false);

  /** What is typed in the search box. */
  protected readonly query = signal('');
  /** What is searched for: `query` once typing has paused (or Enter was pressed). Everything reads this. */
  protected readonly search = signal('');
  private searchTimer: ReturnType<typeof setTimeout> | undefined;
  protected readonly filterValues = signal<FilterValues>({});
  protected readonly sort = signal<string>(this.readStoredSort());
  protected readonly sorts = SORTS;
  protected readonly view = signal<ListView>(this.readStoredView());
  /** What is actually shown: a phone always gets cards, whatever was chosen on a bigger screen. */
  protected readonly shownView = computed<ListView>(() => (this.narrow() ? 'cards' : this.view()));
  protected readonly pageSizes = PAGE_SIZES;
  protected readonly pageSize = signal<number>(this.readStoredPageSize());
  private readonly requestedPage = signal(0);

  private readonly filterContext: FilterContext = { roleOf: (l) => this.roleLabel(l) };

  /** Every filter with the options it currently offers, drawn into the toolbar. */
  protected readonly filters = computed(() =>
    FILTERS.map((filter) => ({
      filter,
      options: filter.options(this.store.logbooks(), this.filterContext),
    })),
  );
  /** The few-option filters shown side by side, with an "all" option in front. */
  protected readonly segmented = computed(() =>
    this.filters()
      .filter(({ filter }) => filter.display === 'segmented')
      .map(({ filter, options }) => ({
        filter,
        options: [
          { value: '', label: filter.allLabel, count: this.store.logbooks().length },
          ...options,
        ],
      })),
  );
  /** The filters behind a button each. One with nothing to choose from is left out. */
  protected readonly menus = computed(() =>
    this.filters().filter(({ filter, options }) => filter.display === 'menu' && options.length > 0),
  );

  /** The search words, lower-case: also what gets marked in the results. */
  protected readonly terms = computed(() =>
    this.search().toLowerCase().split(/\s+/).filter(Boolean),
  );

  private readonly currentSort = computed(
    () => SORTS.find((option) => option.key === this.sort()) ?? SORTS[0],
  );
  protected readonly sortLabel = computed(() => this.currentSort().label);

  /** What narrows the list right now, in words, for the summary and the empty state. */
  protected readonly activeFilters = computed(() => {
    const active: string[] = [];
    if (this.search().trim()) {
      active.push(`Search “${this.search().trim()}”`);
    }
    for (const { filter, options } of this.filters()) {
      const chosen = options.find((o) => o.value === this.filterValues()[filter.id]);
      if (chosen) {
        active.push(filter.display === 'menu' ? `${filter.label}: ${chosen.label}` : chosen.label);
      }
    }
    return active;
  });

  /** Logbooks matching every chosen filter and every word of the search box, in the chosen order. */
  protected readonly visible = computed(() => {
    const words = this.terms();
    const chosen = FILTERS.flatMap((filter) => {
      const value = this.filterValues()[filter.id];
      return value ? [{ filter, value }] : [];
    });
    const matching = this.store.logbooks().filter((logbook) => {
      if (
        !chosen.every(({ filter, value }) => filter.matches(logbook, value, this.filterContext))
      ) {
        return false;
      }
      const haystack = [logbook.title, logbook.description, logbook.instrument, logbook.proposalId]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return words.every((word) => haystack.includes(word));
    });
    return matching.sort(this.currentSort().compare);
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
    const destroyRef = inject(DestroyRef);
    destroyRef.onDestroy(() => clearTimeout(this.searchTimer));
    afterNextRender(() => {
      const sentinel = this.sentinel()?.nativeElement;
      if (sentinel && typeof IntersectionObserver !== 'undefined') {
        // The page may scroll inside a container (the app's `main`), not the window: watch that one.
        const observer = new IntersectionObserver(
          ([entry]) =>
            this.stuck.set(
              !entry.isIntersecting && entry.boundingClientRect.top < (entry.rootBounds?.top ?? 0),
            ),
          { root: scrollParent(sentinel) },
        );
        observer.observe(sentinel);
        destroyRef.onDestroy(() => observer.disconnect());
      }
    });

    // A new search or filter starts again from the first page.
    effect(() => {
      this.search();
      this.filterValues();
      this.sort();
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
      const sort = this.sort();
      try {
        localStorage.setItem(SORT_STORAGE_KEY, sort);
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
    return logbook.myRole ?? '';
  }

  /** Typing waits for a pause before searching; one request per word, not per key. */
  protected setQuery(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.searchNow(), SEARCH_DEBOUNCE_MS);
  }

  /** Searches for what is typed without waiting: Enter, and clearing the box. */
  protected searchNow(): void {
    clearTimeout(this.searchTimer);
    this.search.set(this.query());
  }

  protected clearSearch(): void {
    this.query.set('');
    this.searchNow();
  }

  protected setFilter(filter: LogbookFilter, value: string): void {
    this.filterValues.update((current) => ({ ...current, [filter.id]: value || null }));
  }

  protected isChosen(filter: LogbookFilter, option: FilterOption): boolean {
    return (this.filterValues()[filter.id] ?? '') === option.value;
  }

  /** The label of the chosen option of a menu filter, or its "all" label. */
  protected chosenLabel(entry: { filter: LogbookFilter; options: FilterOption[] }): string {
    const value = this.filterValues()[entry.filter.id];
    return entry.options.find((o) => o.value === value)?.label ?? entry.filter.allLabel;
  }

  protected clearFilters(): void {
    this.clearSearch();
    this.filterValues.set({});
  }

  /** "/" jumps to the search box, as on most sites, unless the user is already typing somewhere. */
  protected focusSearchOnSlash(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    const typing =
      !!target && (target.isContentEditable || /^(input|textarea|select)$/i.test(target.tagName));
    if (event.key === '/' && !typing && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      this.searchInput()?.nativeElement.focus();
    }
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

  private readStoredSort(): string {
    try {
      const stored = localStorage.getItem(SORT_STORAGE_KEY);
      return SORTS.some((option) => option.key === stored) ? (stored as string) : DEFAULT_SORT;
    } catch {
      return DEFAULT_SORT;
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
