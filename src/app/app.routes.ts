import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'logbooks' },
  {
    path: 'logbooks',
    title: 'Logbooks',
    loadComponent: () => import('./features/logbooks/logbook-list').then((m) => m.LogbookList),
  },
  {
    path: 'logbooks/:logbookId/print',
    title: 'Export logbook',
    loadComponent: () => import('./features/print/print-page').then((m) => m.PrintPage),
  },
  {
    path: 'logbooks/:logbookId',
    loadComponent: () => import('./features/logbook/logbook-page').then((m) => m.LogbookPage),
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () =>
          import('./features/logbook/no-entry-selected').then((m) => m.NoEntrySelected),
      },
      {
        path: 'entries/:entryId',
        loadComponent: () => import('./features/entry/entry-page').then((m) => m.EntryPage),
      },
    ],
  },
  { path: '**', redirectTo: 'logbooks' },
];
