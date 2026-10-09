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
    @if (demo()) {
      <span class="tag tag--demo" title="Demo logbook, it cannot be deleted">Demo</span>
    }
    @if (role(); as currentRole) {
      <span class="tag tag--role" [attr.data-role]="currentRole" title="Your role in this logbook">
        <mat-icon>{{ roleIcon() }}</mat-icon
        >{{ currentRole }}
      </span>
    }
    @if (visibility(); as access) {
      <span class="tag tag--access" [attr.title]="accessTitle()">
        <mat-icon>{{ access === 'private' ? 'lock' : 'public' }}</mat-icon>
        {{ access === 'private' ? 'Private' : 'Facility-wide read' }}
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

    // Orange text is too light on a pale tint, so it is darkened (lightened in dark mode) via the text colour.
    .tag--demo {
      padding-left: 9px;
      background: color-mix(in srgb, var(--ess-orange) 18%, transparent);
      color: color-mix(in srgb, var(--ess-orange) 55%, var(--mat-sys-on-surface));
    }

    .tag--access {
      background: transparent;
      box-shadow: inset 0 0 0 1px var(--mat-sys-outline-variant);
      color: var(--mat-sys-on-surface-variant);
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
  readonly demo = input(false);
  readonly visibility = input<Visibility | null>(null);

  protected readonly accessTitle = computed(() =>
    this.visibility() === 'private'
      ? 'Private: only the members can read it'
      : 'Facility-wide read: everyone at the facility can read it',
  );

  protected readonly roleIcon = computed(() => ROLE_ICONS[this.role() ?? 'viewer']);
}
