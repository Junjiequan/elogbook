import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'logbooks' },
  {
    path: 'login',
    title: 'Sign in',
    loadComponent: () =>
      import('./features/test-auth/login-page/login-page').then((m) => m.LoginPage),
  },
  {
    path: '',
    canActivateChild: [authGuard],
    children: [
      {
        path: 'logbooks',
        title: 'Logbooks',
        loadComponent: () =>
          import('./features/logbooks/logbook-list/logbook-list').then((m) => m.LogbookList),
      },
      {
        path: 'logbooks/:logbookId/print',
        title: 'Export logbook',
        loadComponent: () =>
          import('./features/print/print-page/print-page').then((m) => m.PrintPage),
      },
      {
        path: 'logbooks/:logbookId',
        // The content view uses the whole screen: no footer.
        data: { hideFooter: true },
        loadComponent: () =>
          import('./features/logbook/logbook-page/logbook-page').then((m) => m.LogbookPage),
        children: [
          {
            path: '',
            pathMatch: 'full',
            loadComponent: () =>
              import('./features/logbook/no-entry-selected/no-entry-selected').then(
                (m) => m.NoEntrySelected,
              ),
          },
          {
            path: 'entries/:entryId',
            loadComponent: () =>
              import('./features/entry/entry-page/entry-page').then((m) => m.EntryPage),
          },
        ],
      },
    ],
  },
  { path: '**', redirectTo: 'logbooks' },
];
