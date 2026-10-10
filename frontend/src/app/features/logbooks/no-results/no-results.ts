import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';

/**
 * Shown when a search or filter leaves nothing: says what is narrowing the list, and offers the
 * way back with one button.
 */
@Component({
  selector: 'app-no-results',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButton, MatIcon],
  templateUrl: './no-results.html',
  styleUrl: './no-results.scss',
})
export class NoResults {
  /** What is narrowing the list, in words: "Search “x”", "Instrument: LoKI". */
  readonly filters = input<readonly string[]>([]);
  readonly cleared = output<void>();
}
