import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, output, resource } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { MatIconButton } from '@angular/material/button';
import { LogbookRepository } from '../../core/data-access/logbook.repository';
import type { EntryVersion, VersionReason } from '../../core/models/logbook.models';
import { EntryAutosave } from '../entry/entry-autosave';

const REASON_LABELS: Record<VersionReason, string> = {
  auto: 'Automatic',
  manual: 'Saved by user',
  restore: 'Before restore',
};

@Component({
  selector: 'app-history-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, MatIcon, MatIconButton],
  template: `
    <header>
      <h2>Version history</h2>
      <button mat-icon-button (click)="closed.emit()" aria-label="Close version history">
        <mat-icon>close</mat-icon>
      </button>
    </header>
    <ul>
      @for (version of versions.value() ?? []; track version.id) {
        <li>
          <button
            type="button"
            [class.selected]="version.id === selectedId()"
            (click)="selected.emit(version)"
          >
            <span class="when">{{ version.savedAt | date: 'd MMM y, HH:mm' }}</span>
            <span class="who">{{ version.savedBy.name }} · {{ reasonLabel(version.reason) }}</span>
          </button>
        </li>
      } @empty {
        <li class="empty">
          {{
            versions.isLoading()
              ? 'Loading…'
              : 'No saved versions yet. Versions are taken automatically as you write.'
          }}
        </li>
      }
    </ul>
  `,
  styleUrl: './history-panel.scss',
})
export class HistoryPanel {
  /** Version currently being previewed, if any. */
  readonly selectedId = input<string | null>(null);
  readonly selected = output<EntryVersion>();
  readonly closed = output<void>();

  private readonly autosave = inject(EntryAutosave);
  private readonly repository = inject(LogbookRepository);

  protected readonly versions = resource({
    params: () => {
      const entry = this.autosave.entry();
      return entry ? { entryId: entry.id, saves: this.autosave.savedCount() } : undefined;
    },
    loader: ({ params }) => this.repository.listVersions(params.entryId),
  });

  protected reasonLabel(reason: VersionReason): string {
    return REASON_LABELS[reason];
  }
}
