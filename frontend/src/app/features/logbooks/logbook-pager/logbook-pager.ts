import { booleanAttribute, ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatPaginator, type PageEvent } from '@angular/material/paginator';

/**
 * The page controls under a list of logbooks: a bar of its own under the cards, or (`flat`) the footer
 * of the table, divided from the rows by a line.
 */
@Component({
  selector: 'app-logbook-pager',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatPaginator],
  templateUrl: './logbook-pager.html',
  styleUrl: './logbook-pager.scss',
  host: { '[class.flat]': 'flat()' },
})
export class LogbookPager {
  readonly length = input.required<number>();
  readonly pageSize = input.required<number>();
  readonly pageIndex = input.required<number>();
  readonly pageSizes = input.required<readonly number[]>();
  readonly flat = input(false, { transform: booleanAttribute });
  readonly page = output<PageEvent>();
}
