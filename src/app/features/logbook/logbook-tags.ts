import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import type { MemberRole } from '../../core/models/logbook.models';

const ROLE_ICONS: Record<MemberRole, string> = {
  owner: 'workspace_premium',
  editor: 'edit',
  viewer: 'visibility',
};

/**
 * The small coloured tags under a logbook's title: instrument, proposal and the user's role.
 * Instrument uses ESS Cyan, proposal ESS Forest; the role is navy (owner), navy tint (editor) or grey.
 */
@Component({
  selector: 'app-logbook-tags',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIcon],
  template: `
    @if (instrument()) {
      <span class="tag tag--instrument" title="Instrument">
        <mat-icon>sensors</mat-icon>{{ instrument() }}
      </span>
    }
    @if (proposalId()) {
      <span class="tag tag--proposal" [attr.title]="'Proposal ' + proposalId()">
        <mat-icon>description</mat-icon>{{ proposalId() }}
      </span>
    }
    @if (role(); as currentRole) {
      <span class="tag tag--role" [attr.data-role]="currentRole" title="Your role in this logbook">
        <mat-icon>{{ roleIcon() }}</mat-icon
        >{{ currentRole }}
      </span>
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 2px;
    }

    .tag {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      height: 22px;
      padding: 0 9px 0 6px;
      border-radius: 11px;
      font: 500 0.75rem/1 var(--mat-sys-label-small-font, inherit);
      letter-spacing: 0.01em;
      white-space: nowrap;

      mat-icon {
        width: 14px;
        height: 14px;
        font-size: 14px;
      }
    }

    .tag--instrument {
      background: color-mix(in srgb, var(--mat-sys-primary) 14%, transparent);
      color: var(--mat-sys-primary);
    }

    .tag--proposal {
      background: color-mix(in srgb, var(--mat-sys-tertiary) 14%, transparent);
      color: var(--mat-sys-tertiary);
    }

    .tag--role {
      text-transform: capitalize;
      background: var(--mat-sys-surface-container-highest);
      color: var(--mat-sys-on-surface-variant);

      &[data-role='editor'] {
        background: color-mix(in srgb, var(--mat-sys-secondary) 14%, transparent);
        color: var(--mat-sys-secondary);
      }

      // The owner gets the brand colours, since it is the most powerful role.
      &[data-role='owner'] {
        background: var(--ess-navy);
        color: #fff;
      }
    }
  `,
})
export class LogbookTags {
  readonly instrument = input<string | null>(null);
  readonly proposalId = input<string | null>(null);
  readonly role = input<MemberRole | null>(null);

  protected readonly roleIcon = computed(() => ROLE_ICONS[this.role() ?? 'viewer']);
}
