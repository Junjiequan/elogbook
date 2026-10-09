import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { CurrentUserService } from '../../../core/auth/current-user.service';
import { roleOf } from '../../../core/auth/permissions';
import type { Logbook, MemberRole } from '../../../core/models/logbook.models';
import { Truncated } from '../truncated';

const MAX_AVATARS = 3;

/**
 * Compact table of logbooks. Long descriptions are cut with an ellipsis; when that happens a
 * chevron appears that unfolds the full text inside the row, without leaving the page.
 */
@Component({
  selector: 'app-logbook-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, MatIcon, MatIconButton, MatTooltip, RouterLink, Truncated],
  templateUrl: './logbook-table.html',
  styleUrl: './logbook-table.scss',
})
export class LogbookTable {
  readonly logbooks = input.required<Logbook[]>();

  private readonly currentUser = inject(CurrentUserService);
  private readonly router = inject(Router);

  /** Ids of logbooks whose description is unfolded. */
  protected readonly expanded = signal<ReadonlySet<string>>(new Set());

  protected roleLabel(logbook: Logbook): MemberRole | '' {
    return roleOf(logbook, this.currentUser.user()) ?? '';
  }

  protected isExpanded(logbook: Logbook): boolean {
    return this.expanded().has(logbook.id);
  }

  protected toggleExpanded(logbook: Logbook, event: Event): void {
    event.stopPropagation(); // do not trigger the row's "open logbook"
    this.expanded.update((current) => {
      const next = new Set(current);
      if (!next.delete(logbook.id)) {
        next.add(logbook.id);
      }
      return next;
    });
  }

  protected initials(name: string): string {
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join('');
  }

  protected avatars(logbook: Logbook): Logbook['members'] {
    return logbook.members.slice(0, MAX_AVATARS);
  }

  protected extraMembers(logbook: Logbook): number {
    return Math.max(0, logbook.members.length - MAX_AVATARS);
  }

  protected open(logbook: Logbook): void {
    void this.router.navigate(['/logbooks', logbook.id]);
  }
}
