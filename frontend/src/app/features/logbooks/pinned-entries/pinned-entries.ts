import { CdkDrag, CdkDragHandle, CdkDropList, type CdkDragDrop } from '@angular/cdk/drag-drop';
import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  linkedSignal,
  resource,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { CurrentUserService } from '../../../core/auth/current-user.service';
import { LogbookRepository } from '../../../core/data-access/logbook.repository';
import { MAX_PINNED_ENTRIES, type PinnedEntry } from '../../../core/models/logbook.models';
import { LogbooksStore } from '../logbooks.store';

/**
 * The entries this person has pinned, one click from their pages, in an order they choose by
 * dragging (or with Alt + the arrow keys). Pins are set on the entry's own page; here they can be
 * reordered and taken off again. There is room for `MAX_PINNED_ENTRIES`; the free places show as
 * quiet placeholders, so the row never looks half empty and it is clear that more can be pinned.
 * Nothing is shown at all until something is pinned.
 */
@Component({
  selector: 'app-pinned-entries',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CdkDrag, CdkDragHandle, CdkDropList, DatePipe, MatIcon, MatTooltip, RouterLink],
  templateUrl: './pinned-entries.html',
  styleUrl: './pinned-entries.scss',
})
export class PinnedEntries {
  private readonly repository = inject(LogbookRepository);
  private readonly store = inject(LogbooksStore);
  protected readonly currentUser = inject(CurrentUserService);

  private readonly loaded = resource({
    // Reloads whenever the logbooks do (one was created, shared, deleted).
    params: () =>
      this.store.status() === 'ready'
        ? { user: this.currentUser.user(), logbooks: this.store.logbooks() }
        : undefined,
    loader: ({ params }) => this.repository.listPinnedEntries(params.user),
  });

  /** What is shown. It follows what was loaded, but can be reordered at once, before that is saved. */
  protected readonly items = linkedSignal<PinnedEntry[]>(() => this.loaded.value() ?? []);
  /** One placeholder for every free place. */
  protected readonly freePlaces = computed(() =>
    Array.from({ length: Math.max(0, MAX_PINNED_ENTRIES - this.items().length) }),
  );

  protected drop(event: CdkDragDrop<PinnedEntry[]>): void {
    this.move(event.previousIndex, event.currentIndex);
  }

  /** Keyboard alternative to dragging: Alt + ← / → moves the focused tile one place. */
  protected onKey(event: KeyboardEvent, index: number): void {
    const step = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0;
    if (event.altKey && step !== 0) {
      event.preventDefault();
      this.move(index, index + step);
    }
  }

  protected async unpin(item: PinnedEntry): Promise<void> {
    await this.repository.setEntryPinned(this.currentUser.user(), item.entryId, false);
    this.loaded.reload();
  }

  private move(from: number, to: number): void {
    const items = [...this.items()];
    if (from === to || to < 0 || to >= items.length) {
      return;
    }
    items.splice(to, 0, ...items.splice(from, 1));
    this.items.set(items);
    void this.repository.reorderPinnedEntries(
      this.currentUser.user(),
      items.map((i) => i.entryId),
    );
  }
}
