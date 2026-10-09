import { DATE_PIPE_DEFAULT_OPTIONS } from '@angular/common';
import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import {
  TitleStrategy,
  provideRouter,
  withComponentInputBinding,
  withRouterConfig,
} from '@angular/router';
import { DATE_TIME_FORMAT } from './core/date-format';
import { AppTitleStrategy } from './core/titles/app-title-strategy';
import { ProposalRepository } from './core/data-access/proposal.repository';
import { DemoProposalRepository } from '../demo/demo-proposals';
import { IndexedDbLogbookRepository } from './core/data-access/indexeddb-logbook.repository';
import { DemoSeeder } from '../demo/demo-seeder';
import { LogbookRepository } from './core/data-access/logbook.repository';
import { AuthService } from './core/auth/auth.service';
import { TestAuthService } from './features/test-auth/test-auth.service';
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
    { provide: TitleStrategy, useClass: AppTitleStrategy },
    // Dates read year first, e.g. 2026-10-09 08:46.
    { provide: DATE_PIPE_DEFAULT_OPTIONS, useValue: { dateFormat: DATE_TIME_FORMAT } },
    // TEST-ONLY sign-in. To remove: delete features/test-auth, drop these two lines and the /login route,
    // and provide an OIDC-backed AuthService instead.
    TestAuthService,
    { provide: AuthService, useExisting: TestAuthService },
    // Swap these two for HTTP-backed implementations once the NestJS backend exists.
    { provide: LogbookRepository, useClass: IndexedDbLogbookRepository },
    { provide: ProposalRepository, useClass: DemoProposalRepository },
    // Realistic demo logbook for every new user. Remove this line to turn it off.
    DemoSeeder,
  ],
};
