import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { DATE_FORMAT } from '../../../core/date-format';

export interface LogbookStatsData {
  total: number;
  owned: number;
  shared: number;
  /** ISO timestamp of the most recent change, if any. */
  latest: string | null;
}

/** Row of overview tiles shown above the logbook list. */
@Component({
  selector: 'app-logbook-stats',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, MatIcon],
  templateUrl: './logbook-stats.html',
  styleUrl: './logbook-stats.scss',
})
export class LogbookStats {
  protected readonly dateFormat = DATE_FORMAT;
  readonly data = input.required<LogbookStatsData>();
}
