import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { LogbookMember } from '../../../core/models/logbook.models';
import { TablePopover } from '../../../shared/table-popover/table-popover';

const MAX_AVATARS = 3;

/**
 * The people with access to a logbook as a row of round initials. Hover (or focus) an avatar to see
 * the person's name, email and role. With more than three people the row ends in a "…" button that
 * lists everyone; a click keeps that list open until you click elsewhere. Used in the table and on the cards.
 */
@Component({
  selector: 'app-member-avatars',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TablePopover],
  templateUrl: './member-avatars.html',
  styleUrl: './member-avatars.scss',
})
export class MemberAvatars {
  readonly members = input.required<LogbookMember[]>();

  protected readonly shown = computed(() => this.members().slice(0, MAX_AVATARS));
  protected readonly extra = computed(() => Math.max(0, this.members().length - MAX_AVATARS));

  protected initials(name: string): string {
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join('');
  }
}
