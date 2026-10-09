import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { type Data, NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { MatToolbar } from '@angular/material/toolbar';
import { MatTooltip } from '@angular/material/tooltip';
import { AuthService } from './core/auth/auth.service';
import { CurrentUserService } from './core/auth/current-user.service';
import { ThemeService } from './core/theme/theme.service';

export const HEADER_COLLAPSED_KEY = 'elogbook.headerCollapsed';

const readHeaderCollapsed = (): boolean => {
  try {
    return localStorage.getItem(HEADER_COLLAPSED_KEY) === 'true';
  } catch {
    return false;
  }
};

/** Data of the deepest active route (child routes inherit their parents' data). */
const activeRouteData = (router: Router): Data => {
  let route = router.routerState.snapshot.root;
  while (route.firstChild) {
    route = route.firstChild;
  }
  return route.data;
};

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
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly currentUser = inject(CurrentUserService);
  protected readonly theme = inject(ThemeService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly headerCollapsed = signal(readHeaderCollapsed());

  /** Pages whose route says `hideFooter: true` (the logbook content view) get the whole screen. */
  protected readonly fillsScreen = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => !!activeRouteData(this.router)['hideFooter']),
    ),
    { initialValue: true }, // no footer until the first navigation settles, so it never flashes in
  );
  protected readonly showFooter = computed(() => !this.fillsScreen());

  constructor() {
    effect(() => {
      const collapsed = this.headerCollapsed();
      try {
        localStorage.setItem(HEADER_COLLAPSED_KEY, String(collapsed));
      } catch {
        // storage unavailable: the choice just won't survive a reload
      }
    });
  }

  protected toggleHeader(): void {
    this.headerCollapsed.update((collapsed) => !collapsed);
  }

  protected signOut(): void {
    this.auth.signOut();
    void this.router.navigate(['/login']);
  }
}
