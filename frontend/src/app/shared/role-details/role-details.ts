import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { ROLE_CAPABILITIES } from '../../core/models/role-capabilities';
import type { MemberRole } from '../../core/models/logbook.models';

/** What a role can and cannot do, as two short lists: the body of the hover card on a role tag. */
@Component({
  selector: 'app-role-details',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIcon],
  templateUrl: './role-details.html',
  styleUrl: './role-details.scss',
})
export class RoleDetails {
  readonly role = input.required<MemberRole>();
  protected readonly details = computed(() => ROLE_CAPABILITIES[this.role()]);
}
