import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { type Data, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { MatIcon } from '@angular/material/icon';

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
  imports: [MatIcon, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly router = inject(Router);

  /** Pages whose route says `fillsScreen: true` (the logbook content view) use the whole height, scroll inside themselves and have no footer. */
  protected readonly fillsScreen = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => !!activeRouteData(this.router)['fillsScreen']),
    ),
    { initialValue: true }, // no footer or page scrollbar until the first navigation settles, so none flashes in
  );
  protected readonly showFooter = computed(() => !this.fillsScreen());
}
