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
import { Router, RouterLink } from '@angular/router';
import { MatButton } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltip } from '@angular/material/tooltip';
import { CurrentUserService } from '../../../core/auth/current-user.service';
import { canDelete, canWrite } from '../../../core/auth/permissions';
import {
  LogbookRepository,
  PinLimitReachedError,
} from '../../../core/data-access/logbook.repository';
import { MAX_PINNED_ENTRIES } from '../../../core/models/logbook.models';
import type { EntryVersion } from '../../../core/models/logbook.models';
import { firstValueFrom } from 'rxjs';
import { RichTextEditor } from '../../editor/rich-text-editor/rich-text-editor';
import { HistoryPanel } from '../../history/history-panel/history-panel';
import { LogbooksStore } from '../../logbooks/logbooks.store';
import { EntriesStore } from '../../logbook/entries.store';
import {
  DeleteEntryDialog,
  type DeleteEntryDialogData,
} from '../delete-entry-dialog/delete-entry-dialog';
import { EntryAutosave, type SaveStatus } from '../entry-autosave';

const STATUS_TEXT: Record<SaveStatus, string> = {
  saved: 'All changes saved',
  saving: 'Saving…',
  dirty: 'Unsaved changes',
  error: 'Could not save – retrying',
};

const STATUS_ICON: Record<SaveStatus, string> = {
  saved: 'cloud_done',
  saving: 'cloud_sync',
  dirty: 'cloud_upload',
  error: 'cloud_off',
};

@Component({
  selector: 'app-entry-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [EntryAutosave],
  imports: [
    DatePipe,
    HistoryPanel,
    MatButton,
    MatIcon,
    MatProgressSpinner,
    MatTooltip,
    RichTextEditor,
    RouterLink,
  ],
  templateUrl: './entry-page.html',
  styleUrl: './entry-page.scss',
  host: {
    '(document:visibilitychange)': 'flushWhenHidden()',
    '(window:beforeunload)': 'warnIfUnsaved($event)',
  },
})
export class EntryPage {
  readonly logbookId = input.required<string>();
  readonly entryId = input.required<string>();

  protected readonly autosave = inject(EntryAutosave);
  private readonly logbooks = inject(LogbooksStore);
  private readonly currentUser = inject(CurrentUserService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly entries = inject(EntriesStore);
  private readonly repository = inject(LogbookRepository);

  protected readonly mayWrite = computed(() => {
    const logbook = this.logbooks.logbooks().find((l) => l.id === this.logbookId());
    return !!logbook && canWrite(logbook, this.currentUser.user());
  });

  protected readonly mayDelete = computed(() => {
    const logbook = this.logbooks.logbooks().find((l) => l.id === this.logbookId());
    return !!logbook && canDelete(logbook, this.currentUser.user(), this.currentUser.isAdmin());
  });

  /** Whether this person has pinned the entry (pins are personal). */
  protected readonly pinned = signal(false);
  protected readonly historyOpen = signal(false);
  /** Older version being looked at instead of the live entry. */
  protected readonly preview = signal<EntryVersion | null>(null);

  protected readonly statusText = computed(() => STATUS_TEXT[this.autosave.status()]);
  protected readonly statusIcon = computed(() => STATUS_ICON[this.autosave.status()]);

  constructor() {
    effect(() => {
      const id = this.entryId();
      untracked(() => {
        this.preview.set(null);
        this.pinned.set(false);
        void this.autosave.open(id);
        void this.loadPinned(id);
      });
    });
  }

  private async loadPinned(entryId: string): Promise<void> {
    const pinned = await this.repository.isEntryPinned(this.currentUser.user(), entryId);
    if (this.entryId() === entryId) {
      this.pinned.set(pinned);
    }
  }

  protected async togglePin(): Promise<void> {
    const pin = !this.pinned();
    this.pinned.set(pin); // at once; it is undone below if saving the pin fails
    try {
      await this.repository.setEntryPinned(this.currentUser.user(), this.entryId(), pin);
    } catch (error) {
      this.pinned.set(!pin);
      this.snackBar.open(
        error instanceof PinLimitReachedError
          ? `You can pin up to ${MAX_PINNED_ENTRIES} entries. Unpin one first.`
          : 'Could not change the pin.',
        'Dismiss',
        { duration: 6000 },
      );
    }
  }

  protected onTitle(event: Event): void {
    this.autosave.edit({ title: (event.target as HTMLInputElement).value });
  }

  protected async saveVersion(): Promise<void> {
    await this.autosave.saveVersion();
    this.snackBar.open('Version saved.', undefined, { duration: 2500 });
  }

  protected async restorePreview(): Promise<void> {
    const version = this.preview();
    if (version) {
      await this.autosave.restore(version.id);
      this.preview.set(null);
      this.snackBar.open(
        'Version restored. The previous text is still in the history.',
        undefined,
        { duration: 4000 },
      );
    }
  }

  protected async deleteEntry(): Promise<void> {
    const entry = this.autosave.entry();
    const logbook = this.logbooks.logbooks().find((l) => l.id === this.logbookId());
    if (!entry || !logbook) {
      return;
    }
    const confirmed = await firstValueFrom(
      this.dialog
        .open<DeleteEntryDialog, DeleteEntryDialogData, boolean>(DeleteEntryDialog, {
          data: { entry, logbook },
        })
        .afterClosed(),
    );
    if (!confirmed) {
      return;
    }
    try {
      await this.autosave.discard(); // never write to an entry that is about to disappear
      await this.entries.delete(entry, logbook);
    } catch {
      this.snackBar.open('Could not delete the entry.', 'Dismiss', { duration: 6000 });
      return;
    }
    this.snackBar.open(`Deleted “${entry.title || 'Untitled entry'}”.`, undefined, {
      duration: 4000,
    });
    await this.router.navigate(['/logbooks', logbook.id]);
  }

  protected toggleHistory(): void {
    this.historyOpen.update((open) => !open);
    this.preview.set(null);
  }

  protected flushWhenHidden(): void {
    if (document.visibilityState === 'hidden') {
      void this.autosave.flush();
    }
  }

  protected warnIfUnsaved(event: BeforeUnloadEvent): void {
    if (this.autosave.status() !== 'saved') {
      void this.autosave.flush();
      event.preventDefault();
    }
  }
}
