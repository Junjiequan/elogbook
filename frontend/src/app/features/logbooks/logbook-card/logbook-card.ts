import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import type { Logbook, MemberRole } from '../../../core/models/logbook.models';
import { LogbookTags } from '../../../shared/logbook-tags/logbook-tags';
import { TablePopover } from '../../../shared/table-popover/table-popover';
import { Highlight } from '../../../shared/highlight/highlight';
import { MemberAvatars } from '../member-avatars/member-avatars';
import { Truncated } from '../../../shared/truncated/truncated';

/**
 * One logbook as a card in the list: title and description (cut after 2 and 3 lines, in full in a
 * hover card), its tags and members, when it was last updated, and the View button that opens it.
 * Every card is the same height, so a grid of them stays even.
 */
@Component({
  selector: 'app-logbook-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    Highlight,
    LogbookTags,
    MatButton,
    MatIcon,
    MemberAvatars,
    RouterLink,
    TablePopover,
    Truncated,
  ],
  templateUrl: './logbook-card.html',
  styleUrl: './logbook-card.scss',
})
export class LogbookCard {
  readonly logbook = input.required<Logbook>();
  /** The signed-in person's role in this logbook. */
  readonly role = input<MemberRole | null>(null);
  /** Search words to mark in the title and description. */
  readonly terms = input<readonly string[]>([]);
}
