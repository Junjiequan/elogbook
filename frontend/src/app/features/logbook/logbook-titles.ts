import { inject, Injector } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import type { ResolveFn } from '@angular/router';
import { catchError, filter, firstValueFrom, of, timeout } from 'rxjs';
import { LogbooksStore } from '../logbooks/logbooks.store';

/** How long a page title may hold up navigation while the logbooks are still loading. */
const MAX_WAIT_MS = 2000;

/** Name of the logbook with this id, once the logbooks have loaded. */
async function logbookName(store: LogbooksStore, injector: Injector, id: string) {
  if (store.status() === 'loading') {
    await firstValueFrom(
      toObservable(store.status, { injector }).pipe(
        filter((status) => status !== 'loading'),
        timeout(MAX_WAIT_MS),
        catchError(() => of(undefined)),
      ),
    );
  }
  return store.logbooks().find((l) => l.id === id)?.title;
}

/** Tab title of a logbook page, so it no longer shows the page visited before (e.g. "Export logbook"). */
export const logbookTitle: ResolveFn<string> = async (route) => {
  const name = await logbookName(
    inject(LogbooksStore),
    inject(Injector),
    route.params['logbookId'],
  );
  return name ?? 'Logbook';
};

/** Tab title of the export page: "Export · <logbook>". */
export const exportTitle: ResolveFn<string> = async (route) => {
  const name = await logbookName(
    inject(LogbooksStore),
    inject(Injector),
    route.params['logbookId'],
  );
  return name ? `Export · ${name}` : 'Export logbook';
};

/** Tab title of an entry until it has loaded; the entry page then sets "<entry> · <logbook>" itself. */
export const entryTitle: ResolveFn<string> = async (route) => {
  const name = await logbookName(
    inject(LogbooksStore),
    inject(Injector),
    route.params['logbookId'],
  );
  return name ? `Entry · ${name}` : 'Entry';
};
