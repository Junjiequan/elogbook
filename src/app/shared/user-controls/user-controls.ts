import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatIcon } from '@angular/material/icon';
import { AuthService } from '../../core/auth/auth.service';
import { CurrentUserService } from '../../core/auth/current-user.service';
import { ThemeService, type ThemeMode } from '../../core/theme/theme.service';
import { TablePopover } from '../table-popover/table-popover';

/** Quick to open: this is a menu the user reached for, not a hint that pops up while reading. */
const OPEN_DELAY_MS = 120;

/**
 * One icon in a page's top-right corner. Hovering it (or pressing it) opens a small panel with
 * what belongs to the person rather than to a page: who is signed in, the light / dark choice, and
 * signing out. Pages place it in their own corner, so the app needs no bar across the top for it.
 */
@Component({
  selector: 'app-user-controls',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIcon, TablePopover],
  templateUrl: './user-controls.html',
  styleUrl: './user-controls.scss',
})
export class UserControls {
  protected readonly currentUser = inject(CurrentUserService);
  protected readonly theme = inject(ThemeService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly openDelay = OPEN_DELAY_MS;
  protected readonly modes: { mode: ThemeMode; label: string; icon: string }[] = [
    { mode: 'light', label: 'Light', icon: 'light_mode' },
    { mode: 'dark', label: 'Dark', icon: 'dark_mode' },
  ];

  protected signOut(): void {
    this.auth.signOut();
    void this.router.navigate(['/login']);
  }
}
