import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { MatToolbar } from '@angular/material/toolbar';
import { MatTooltip } from '@angular/material/tooltip';
import { AuthService } from './core/auth/auth.service';
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
      <a class="brand" routerLink="/logbooks" aria-label="eLogbook home">
        <span class="logo"><mat-icon>menu_book</mat-icon></span>
        <span class="brand-text"><strong>eLogbook</strong></span>
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
      @if (currentUser.isSignedIn()) {
        <span class="user-name">{{ currentUser.user().name }}</span>
        <button
          mat-icon-button
          [matMenuTriggerFor]="userMenu"
          matTooltip="Account"
          aria-label="Account"
        >
          <mat-icon>account_circle</mat-icon>
        </button>
        <mat-menu #userMenu="matMenu">
          <div
            class="account"
            (click)="$event.stopPropagation()"
            (keydown)="$event.stopPropagation()"
            tabindex="-1"
          >
            <strong>{{ currentUser.user().name }}</strong>
            <span>{{ currentUser.user().email }}</span>
            @if (currentUser.isAdmin()) {
              <span class="admin-badge">Administrator</span>
            }
          </div>
          <button mat-menu-item (click)="signOut()">
            <mat-icon>logout</mat-icon>
            <span>Sign out</span>
          </button>
        </mat-menu>
      }
    </mat-toolbar>
    <main><router-outlet /></main>
    <footer class="shell-footer no-print">
      <span class="footer-brand"><mat-icon>menu_book</mat-icon> eLogbook</span>
      <span class="footer-note">Open-source MVP · your demo data stays in this browser</span>
      <nav class="footer-links" aria-label="Project links">
        <a href="https://github.com/Junjiequan/elogbook" target="_blank" rel="noopener">Source</a>
        <a
          href="https://github.com/Junjiequan/elogbook/blob/main/LICENSE"
          target="_blank"
          rel="noopener"
          >MIT licence</a
        >
      </nav>
    </footer>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      height: 100dvh;
    }
    .shell-bar {
      position: relative;
      z-index: 3;
      flex: none;
      background: var(--app-brand-bg);
      color: var(--app-brand-text);
      box-shadow: 0 2px 10px rgb(10 30 80 / 28%);
      --mat-toolbar-container-background-color: transparent;
      --mat-toolbar-container-text-color: var(--app-brand-text);
      --mat-icon-button-icon-color: var(--app-brand-text);
      --mat-icon-button-state-layer-color: #fff;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
      color: inherit;
      text-decoration: none;
      font-size: 1.15rem;
      letter-spacing: 0.01em;

      strong {
        font-weight: 700;
      }
    }
    .logo {
      display: grid;
      place-items: center;
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: rgb(255 255 255 / 18%);
      box-shadow: inset 0 0 0 1px rgb(255 255 255 / 30%);
    }
    .spacer {
      flex: 1;
    }
    .account {
      display: flex;
      flex-direction: column;
      padding: 8px 16px 12px;
      font: var(--mat-sys-body-small);
      color: var(--mat-sys-on-surface-variant);

      strong {
        font: var(--mat-sys-title-small);
        color: var(--mat-sys-on-surface);
      }
    }
    .admin-badge {
      align-self: flex-start;
      margin-top: 6px;
      padding: 1px 8px;
      border-radius: 999px;
      background: var(--mat-sys-primary);
      color: var(--mat-sys-on-primary);
      font: var(--mat-sys-label-small);
    }
    .user-name {
      font-size: 0.875rem;
      margin-left: 4px;
    }
    main {
      flex: 1;
      min-height: 0;
      overflow: auto;
    }
    .shell-footer {
      position: relative;
      z-index: 3;
      flex: none;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 4px 20px;
      padding: 10px 20px;
      background: var(--app-brand-bg);
      color: rgb(255 255 255 / 86%);
      font: var(--mat-sys-label-medium);

      a {
        color: #fff;
        text-decoration: none;
        border-bottom: 1px solid rgb(255 255 255 / 40%);

        &:hover,
        &:focus-visible {
          border-bottom-color: #fff;
        }
      }
    }
    .footer-brand {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-weight: 600;
      color: #fff;

      mat-icon {
        width: 18px;
        height: 18px;
        font-size: 18px;
      }
    }
    .footer-note {
      flex: 1;
    }
    .footer-links {
      display: flex;
      gap: 16px;
    }
    @media (max-width: 700px) {
      .user-name,
      .footer-note {
        display: none;
      }
      .footer-brand {
        flex: 1;
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
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected signOut(): void {
    this.auth.signOut();
    void this.router.navigate(['/login']);
  }
}
