import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { MatToolbar } from '@angular/material/toolbar';
import { MatTooltip } from '@angular/material/tooltip';
import { CurrentUserService } from './core/auth/current-user.service';
import { ThemeService } from './core/theme/theme.service';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatIcon,
    MatIconButton,
    MatMenu,
    MatMenuItem,
    MatMenuTrigger,
    MatToolbar,
    MatTooltip,
    RouterLink,
    RouterOutlet,
  ],
  template: `
    <mat-toolbar class="shell-bar no-print">
      <a class="brand" routerLink="/logbooks">
        <mat-icon>menu_book</mat-icon>
        <span>ESS eLogbook</span>
      </a>
      <span class="spacer"></span>
      <button
        mat-icon-button
        (click)="theme.toggle()"
        [matTooltip]="theme.mode() === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
        [attr.aria-label]="theme.mode() === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
        [attr.aria-pressed]="theme.mode() === 'dark'"
      >
        <mat-icon>{{ theme.mode() === 'dark' ? 'light_mode' : 'dark_mode' }}</mat-icon>
      </button>
      <span class="user-name">{{ currentUser.user().name }}</span>
      <button
        mat-icon-button
        [matMenuTriggerFor]="userMenu"
        matTooltip="Switch demo user"
        aria-label="Switch demo user"
      >
        <mat-icon>account_circle</mat-icon>
      </button>
      <mat-menu #userMenu="matMenu">
        @for (user of currentUser.users; track user.id) {
          <button mat-menu-item (click)="currentUser.switchTo(user.id)">
            <mat-icon>{{
              user.id === currentUser.user().id ? 'radio_button_checked' : 'radio_button_unchecked'
            }}</mat-icon>
            <span>{{ user.name }}</span>
          </button>
        }
      </mat-menu>
    </mat-toolbar>
    <main><router-outlet /></main>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      height: 100dvh;
    }
    .shell-bar {
      flex: none;
      background: var(--mat-sys-surface-container-low);
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 8px;
      color: inherit;
      text-decoration: none;
      font-weight: 500;
    }
    .spacer {
      flex: 1;
    }
    .user-name {
      font-size: 0.875rem;
    }
    main {
      flex: 1;
      min-height: 0;
      overflow: auto;
    }
    @media (max-width: 600px) {
      .user-name {
        display: none;
      }
    }
    @media print {
      :host {
        display: block;
        height: auto;
      }
      main {
        overflow: visible;
      }
    }
  `,
})
export class App {
  protected readonly currentUser = inject(CurrentUserService);
  protected readonly theme = inject(ThemeService);
}
