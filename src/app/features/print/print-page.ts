import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  resource,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatProgressBar } from '@angular/material/progress-bar';
import { LogbookRepository } from '../../core/data-access/logbook.repository';
import { RichTextEditor } from '../editor/rich-text-editor';
import { LogbooksStore } from '../logbooks/logbooks.store';

/**
 * Print-friendly rendering of a whole logbook (or one entry via `?entry=`).
 * "Export" is the browser's print dialog → Save as PDF, so the output is plain, generic text.
 */
@Component({
  selector: 'app-print-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, MatButton, MatIcon, MatProgressBar, RichTextEditor, RouterLink],
  templateUrl: './print-page.html',
  styleUrl: './print-page.scss',
})
export class PrintPage {
  readonly logbookId = input.required<string>();
  /** Restrict the export to a single entry. */
  readonly entry = input<string>();

  private readonly repository = inject(LogbookRepository);
  private readonly logbooks = inject(LogbooksStore);

  protected readonly logbook = computed(() =>
    this.logbooks.logbooks().find((l) => l.id === this.logbookId()),
  );
  protected readonly exportedAt = new Date();

  protected readonly entries = resource({
    params: () => ({ logbookId: this.logbookId(), only: this.entry() }),
    loader: async ({ params }) => {
      const all = await this.repository.listEntries(params.logbookId);
      const chosen = params.only ? all.filter((e) => e.id === params.only) : all;
      return chosen.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    },
  });

  protected print(): void {
    window.print();
  }
}
