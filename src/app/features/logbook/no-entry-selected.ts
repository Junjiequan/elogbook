import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'app-no-entry-selected',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIcon],
  template: `
    <div class="empty">
      <mat-icon>edit_note</mat-icon>
      <p>Select an entry, or create a new one.</p>
    </div>
  `,
  styles: `
    .empty {
      display: grid;
      place-items: center;
      align-content: center;
      gap: 8px;
      height: 100%;
      min-height: 240px;
      color: var(--mat-sys-on-surface-variant);
    }
    mat-icon {
      width: 48px;
      height: 48px;
      font-size: 48px;
    }
  `,
})
export class NoEntrySelected {}
