import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { CurrentUserService } from '../../../core/auth/current-user.service';
import { roleOf } from '../../../core/auth/permissions';
import type { Logbook, MemberRole } from '../../../core/models/logbook.models';
import { Highlight } from '../../../shared/highlight/highlight';
import { MemberAvatars } from '../member-avatars/member-avatars';
import { TablePopover } from '../../../shared/table-popover/table-popover';
import { Truncated } from '../../../shared/truncated/truncated';

/**
 * Compact table of logbooks: every row is one line. A long title or description is cut with an
 * ellipsis and shown in full in a card on hover (only while it is cut); with more than three members,
 * the last avatar is a "…" that lists everyone. All cards are `TablePopover`, which can be pinned open
 * (one at a time). A row does nothing when clicked: the eye button in the first column opens the logbook.
 */
@Component({
  selector: 'app-logbook-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    Highlight,
    MatIconButton,
    MatIcon,
    MatTooltip,
    MemberAvatars,
    RouterLink,
    TablePopover,
    Truncated,
  ],
  templateUrl: './logbook-table.html',
  styleUrl: './logbook-table.scss',
})
export class LogbookTable {
  readonly logbooks = input.required<Logbook[]>();
  /** Search words to mark in the titles and descriptions. */
  readonly terms = input<readonly string[]>([]);

  private readonly currentUser = inject(CurrentUserService);

  protected roleLabel(logbook: Logbook): MemberRole | '' {
    return roleOf(logbook, this.currentUser.user()) ?? '';
  }
}
