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
import { RouterLink } from '@angular/router';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltip } from '@angular/material/tooltip';
import { CurrentUserService } from '../../core/auth/current-user.service';
import { canWrite } from '../../core/auth/permissions';
import type { EntryVersion } from '../../core/models/logbook.models';
import { RichTextEditor } from '../editor/rich-text-editor';
import { HistoryPanel } from '../history/history-panel';
import { LogbooksStore } from '../logbooks/logbooks.store';
import { EntryAutosave, type SaveStatus } from './entry-autosave';

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

  protected readonly mayWrite = computed(() => {
    const logbook = this.logbooks.logbooks().find((l) => l.id === this.logbookId());
    return !!logbook && canWrite(logbook, this.currentUser.user());
  });

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
        void this.autosave.open(id);
      });
    });
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
