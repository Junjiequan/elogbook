import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'app-no-entry-selected',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIcon],
  templateUrl: './no-entry-selected.html',
  styleUrl: './no-entry-selected.scss',
})
export class NoEntrySelected {}
