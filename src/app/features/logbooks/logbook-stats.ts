import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatIcon } from '@angular/material/icon';

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
  template: `
    <section class="stats" aria-label="Overview">
      <div class="stat">
        <span class="icon"><mat-icon>menu_book</mat-icon></span>
        <span class="text"
          ><strong>{{ data().total }}</strong
          ><span>Logbooks</span></span
        >
      </div>
      <div class="stat">
        <span class="icon"><mat-icon>person</mat-icon></span>
        <span class="text"
          ><strong>{{ data().owned }}</strong
          ><span>Owned by me</span></span
        >
      </div>
      <div class="stat">
        <span class="icon"><mat-icon>group</mat-icon></span>
        <span class="text"
          ><strong>{{ data().shared }}</strong
          ><span>Shared with me</span></span
        >
      </div>
      <div class="stat">
        <span class="icon"><mat-icon>update</mat-icon></span>
        <span class="text"
          ><strong>{{ data().latest | date: 'd MMM' }}</strong
          ><span>Last activity</span></span
        >
      </div>
    </section>
  `,
  styles: `
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
      gap: 14px;
    }
    .stat {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 14px 16px;
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: 8px;
      background: var(--mat-sys-surface);
      box-shadow: 0 1px 3px rgb(10 30 80 / 8%);
    }
    .icon {
      display: grid;
      place-items: center;
      flex: none;
      width: 44px;
      height: 44px;
      border-radius: 8px;
      background: var(--app-brand-bg);
      color: #fff;
    }
    .text {
      display: flex;
      flex-direction: column;
      min-width: 0;

      strong {
        font: var(--mat-sys-headline-small);
        line-height: 1.1;
      }
      span {
        font: var(--mat-sys-label-medium);
        color: var(--mat-sys-on-surface-variant);
      }
    }
  `,
})
export class LogbookStats {
  readonly data = input.required<LogbookStatsData>();
}
