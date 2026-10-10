import { DATE_PIPE_DEFAULT_OPTIONS } from '@angular/common';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import {
  TitleStrategy,
  provideRouter,
  withComponentInputBinding,
  withRouterConfig,
} from '@angular/router';
import { AppConfig } from './core/api/app-config';
import { ApiAuthService } from './core/auth/api-auth.service';
import { AuthService } from './core/auth/auth.service';
import { authInterceptor } from './core/auth/auth.interceptor';
import { DATE_TIME_FORMAT } from './core/date-format';
import { DemoProposalRepository } from './core/data-access/demo-proposal.repository';
import { HttpLogbookRepository } from './core/data-access/http-logbook.repository';
import { LogbookRepository } from './core/data-access/logbook.repository';
import { ProposalRepository } from './core/data-access/proposal.repository';
import { AppTitleStrategy } from './core/titles/app-title-strategy';
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
    provideHttpClient(withInterceptors([authInterceptor])),
    // Where the API is comes from config.json, so one build can run against any deployment.
    provideAppInitializer(() => inject(AppConfig).load()),
    { provide: TitleStrategy, useClass: AppTitleStrategy },
    // Dates read year first, e.g. 2026-10-09 08:46.
    { provide: DATE_PIPE_DEFAULT_OPTIONS, useValue: { dateFormat: DATE_TIME_FORMAT } },
    { provide: AuthService, useExisting: ApiAuthService },
    { provide: LogbookRepository, useClass: HttpLogbookRepository },
    // The proposal system has no API yet: fixed proposals and samples.
    { provide: ProposalRepository, useClass: DemoProposalRepository },
  ],
};
