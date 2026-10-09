import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import type { Visibility, MemberRole } from '../../core/models/logbook.models';

const ROLE_ICONS: Record<MemberRole, string> = {
  owner: 'workspace_premium',
  editor: 'edit',
  viewer: 'visibility',
};

/**
 * The small coloured tags describing a logbook: instrument, proposal and the user's role, and on the
 * list also "Demo" and who can read it. Instrument uses ESS Cyan, proposal ESS Forest, demo ESS Orange;
 * the role is navy (owner), navy tint (editor) or grey.
 */
@Component({
  selector: 'app-logbook-tags',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIcon],
  templateUrl: './logbook-tags.html',
  styleUrl: './logbook-tags.scss',
})
export class LogbookTags {
  readonly instrument = input<string | null>(null);
  readonly proposalId = input<string | null>(null);
  readonly role = input<MemberRole | null>(null);
  readonly demo = input(false);
  readonly visibility = input<Visibility | null>(null);

  protected readonly accessTitle = computed(() =>
    this.visibility() === 'private'
      ? 'Private: only the members can read it'
      : 'Facility-wide read: everyone at the facility can read it',
  );

  protected readonly roleIcon = computed(() => ROLE_ICONS[this.role() ?? 'viewer']);
}
