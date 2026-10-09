import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter, withComponentInputBinding, withRouterConfig } from '@angular/router';
import {
  ExperimentContext,
  StaticExperimentContext,
} from './core/experiment-context/experiment-context';
import { IndexedDbLogbookRepository } from './core/data-access/indexeddb-logbook.repository';
import { LogbookRepository } from './core/data-access/logbook.repository';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(
      routes,
      withComponentInputBinding(),
      // Child routes (entries) also receive `logbookId` as an input.
      withRouterConfig({ paramsInheritanceStrategy: 'always' }),
    ),
    // Swap these two for HTTP-backed implementations once the NestJS backend exists.
    { provide: LogbookRepository, useClass: IndexedDbLogbookRepository },
    { provide: ExperimentContext, useClass: StaticExperimentContext },
  ],
};
