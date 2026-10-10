import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
  type TestRequest,
} from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  TitleStrategy,
  provideRouter,
  withComponentInputBinding,
  withRouterConfig,
} from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from './app.routes';
import { ApiAuthService } from './core/auth/api-auth.service';
import { AuthService } from './core/auth/auth.service';
import { authInterceptor } from './core/auth/auth.interceptor';
import { HttpLogbookRepository } from './core/data-access/http-logbook.repository';
import { HttpProposalRepository } from './core/data-access/http-proposal.repository';
import { LogbookRepository } from './core/data-access/logbook.repository';
import { ProposalRepository } from './core/data-access/proposal.repository';
import type { Entry, Logbook, PinnedEntry } from './core/models/logbook.models';
import { AppTitleStrategy } from './core/titles/app-title-strategy';
import { OWNER_ACCESS } from './testing/logbook-fixtures';
import { TEST_USERS } from './testing/test-users';

const [anna, jon] = TEST_USERS;
const API = '/api/v1';
const NOW = '2026-10-09T08:00:00.000Z';

const logbook = (id: string, title: string): Logbook => ({
  id,
  title,
  description: '',
  instrument: 'LoKI',
  proposalId: null,
  visibility: 'private',
  owner: anna,
  members: [{ user: anna, role: 'owner' }],
  ...OWNER_ACCESS,
  createdAt: NOW,
  updatedAt: NOW,
});

const entry = (id: string, logbookId: string, title: string): Entry => ({
  id,
  logbookId,
  title,
  content: { type: 'doc', content: [{ type: 'paragraph' }] },
  revision: 1,
  createdAt: NOW,
  updatedAt: NOW,
  updatedBy: jon,
});

const LOGBOOKS = [logbook('l1', 'LoKI beamtime'), logbook('l2', 'ESTIA run')];
// Newest first, as the API sends them.
const ENTRIES: Record<string, Entry[]> = {
  l1: [entry('e2', 'l1', 'Day 2'), entry('e1', 'l1', 'Day 1')],
  l2: [entry('e3', 'l2', 'Alignment')],
};
const PINS: PinnedEntry[] = [
  {
    entryId: 'e1',
    entryTitle: 'Day 1',
    logbookId: 'l1',
    logbookTitle: 'LoKI beamtime',
    instrument: 'LoKI',
    pinnedAt: NOW,
    updatedAt: NOW,
    updatedBy: jon,
  },
];

/** What the API would answer; anything else is a request the app should not be making. */
function answer(method: string, path: string): object | undefined {
  const entryMatch = path.match(/^\/entries\/(\w+)$/);
  const listMatch = path.match(/^\/logbooks\/(\w+)\/entries$/);
  if (method === 'GET' && path === '/logbooks') return LOGBOOKS;
  if (method === 'GET' && path === '/pins') return PINS;
  if (method === 'GET' && listMatch) return ENTRIES[listMatch[1]];
  if (method === 'GET' && entryMatch) {
    return Object.values(ENTRIES)
      .flat()
      .find((e) => e.id === entryMatch[1]);
  }
  throw new Error(`Unexpected request: ${method} ${path}`);
}

/**
 * The whole app (real routes, pages, stores) against a pretend API, counting what each page switch asks the API.
 * No request may be made twice during one switch: every call is a wait for the person and load on the server.
 */
describe('what the app asks the API when pages are switched', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;

  /** Lets timers and promises run, and the app's effects (zoneless: nothing runs them unprompted in a test). */
  const tick = async () => {
    await new Promise<void>((done) => setTimeout(done, 25));
    TestBed.tick();
  };

  /** Answers every request the app makes until it has gone quiet, and returns them in the order they came. */
  async function settle(): Promise<string[]> {
    const seen: string[] = [];
    let quiet = 0;
    while (quiet < 3) {
      await tick();
      const pending: TestRequest[] = http.match(() => true);
      quiet = pending.length === 0 ? quiet + 1 : 0;
      for (const request of pending) {
        const path = request.request.urlWithParams.replace(API, '');
        seen.push(`${request.request.method} ${path}`);
        request.flush(answer(request.request.method, path) ?? null);
      }
    }
    return seen;
  }

  async function visit(url: string): Promise<string[]> {
    const navigation = harness.navigateByUrl(url);
    const seen = await settle();
    await navigation;
    return [...seen, ...(await settle())];
  }

  const duplicates = (requests: string[]) =>
    requests.filter((request, index) => requests.indexOf(request) !== index);

  beforeEach(async () => {
    localStorage.setItem(
      'elogbook.session',
      JSON.stringify({ token: 't', expiresAt: Date.now() + 3_600_000, user: anna, isAdmin: false }),
    );
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter(
          routes,
          withComponentInputBinding(),
          withRouterConfig({ paramsInheritanceStrategy: 'always' }),
        ),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: TitleStrategy, useClass: AppTitleStrategy },
        { provide: AuthService, useExisting: ApiAuthService },
        { provide: LogbookRepository, useClass: HttpLogbookRepository },
        { provide: ProposalRepository, useClass: HttpProposalRepository },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
  });

  afterEach(() => {
    localStorage.removeItem('elogbook.session');
    http.verify();
  });

  it('asks for each thing once on every page, and only for what the page needs', async () => {
    const trip: [string, string[]][] = [
      ['/logbooks', ['GET /logbooks', 'GET /pins']],
      // The logbooks are already known, so only this logbook's entries and its latest entry are fetched.
      ['/logbooks/l1', ['GET /logbooks/l1/entries', 'GET /entries/e2', 'GET /pins']],
      // Another entry of the same logbook: its list is already there.
      ['/logbooks/l1/entries/e1', ['GET /entries/e1', 'GET /pins']],
      ['/logbooks/l2', ['GET /logbooks/l2/entries', 'GET /entries/e3', 'GET /pins']],
      // Back to the list: only its own pinned panel is refreshed.
      ['/logbooks', ['GET /pins']],
      ['/logbooks/l1/print', ['GET /logbooks/l1/entries']],
    ];

    for (const [url, expected] of trip) {
      const requests = await visit(url);

      expect(duplicates(requests), `repeated on ${url}`).toEqual([]);
      expect([...requests].sort(), `asked on ${url}`).toEqual([...expected].sort());
    }
  });

  it('does not ask again when the same page is revisited quickly, one entry after another', async () => {
    await visit('/logbooks/l1/entries/e1');

    for (const id of ['e2', 'e1', 'e2']) {
      const requests = await visit(`/logbooks/l1/entries/${id}`);
      expect(duplicates(requests), `repeated on ${id}`).toEqual([]);
      expect(requests.filter((r) => r.startsWith('GET /entries/'))).toEqual([`GET /entries/${id}`]);
    }
  });
});
