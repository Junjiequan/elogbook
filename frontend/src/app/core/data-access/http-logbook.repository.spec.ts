import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { EntryConflictError, LogbookRepository, PinLimitReachedError } from './logbook.repository';
import { HttpLogbookRepository } from './http-logbook.repository';
import { TEST_USERS } from '../../testing/test-users';

const [anna, jon] = TEST_USERS;
const API = '/api/v1';

describe('HttpLogbookRepository', () => {
  let repository: LogbookRepository;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: LogbookRepository, useClass: HttpLogbookRepository },
      ],
    });
    repository = TestBed.inject(LogbookRepository);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  /** Answers the one request that is expected, and returns what was sent. */
  const answer = (method: string, path: string, body: object | null = null, init = {}) => {
    const request = http.expectOne(`${API}${path}`);
    expect(request.request.method).toBe(method);
    request.flush(body, init);
    return request.request;
  };

  it('lists and creates logbooks', async () => {
    const listed = repository.listLogbooks();
    answer('GET', '/logbooks', [{ id: 'l1' }]);
    expect(await listed).toEqual([{ id: 'l1' }] as never);

    const created = repository.createLogbook({
      title: 'T',
      description: '',
      instrument: null,
      proposalId: null,
    });
    const request = answer('POST', '/logbooks', { id: 'l2' });
    expect(request.body).toEqual({
      title: 'T',
      description: '',
      instrument: null,
      proposalId: null,
    });
    expect(await created).toEqual({ id: 'l2' } as never);
  });

  it('sends the members of a logbook as emails and roles, which is how the API finds people', async () => {
    const updated = repository.updateLogbook('l1', {
      title: 'New',
      visibility: 'facility-read',
      members: [
        { user: anna, role: 'owner' },
        { user: jon, role: 'editor' },
      ],
    });

    const request = answer('PATCH', '/logbooks/l1', { id: 'l1' });

    expect(request.body).toEqual({
      title: 'New',
      visibility: 'facility-read',
      members: [
        { email: anna.email, role: 'owner' },
        { email: jon.email, role: 'editor' },
      ],
    });
    await updated;
  });

  it('leaves the members out when they are not being changed', async () => {
    const updated = repository.updateLogbook('l1', { title: 'Only the title' });

    expect(answer('PATCH', '/logbooks/l1', {}).body).toEqual({ title: 'Only the title' });
    await updated;
  });

  it('deletes a logbook', async () => {
    const deleted = repository.deleteLogbook('l1');
    answer('DELETE', '/logbooks/l1');
    await deleted;
  });

  it('lists, creates, reads and deletes entries', async () => {
    const listed = repository.listEntries('l1');
    answer('GET', '/logbooks/l1/entries', []);
    expect(await listed).toEqual([]);

    const created = repository.createEntry('l1');
    answer('POST', '/logbooks/l1/entries', { id: 'e1' });
    expect(await created).toEqual({ id: 'e1' } as never);

    const read = repository.getEntry('e1');
    answer('GET', '/entries/e1', { id: 'e1' });
    expect(await read).toEqual({ id: 'e1' } as never);

    const deleted = repository.deleteEntry('e1');
    answer('DELETE', '/entries/e1');
    await deleted;
  });

  it('answers "no such entry" for a 404, but not for other failures', async () => {
    const missing = repository.getEntry('gone');
    answer('GET', '/entries/gone', {}, { status: 404, statusText: 'Not Found' });
    expect(await missing).toBeUndefined();

    const broken = repository.getEntry('e1');
    answer('GET', '/entries/e1', {}, { status: 500, statusText: 'Server Error' });
    await expect(broken).rejects.toThrow();
  });

  it('saves on top of the revision it was given', async () => {
    const saved = repository.saveEntry('e1', { title: 'T' }, 4);

    expect(answer('PATCH', '/entries/e1', { id: 'e1', revision: 5 }).body).toEqual({
      title: 'T',
      revision: 4,
    });
    expect((await saved).revision).toBe(5);
  });

  it('turns "someone saved first" into a conflict that says which revision is current', async () => {
    const saved = repository.saveEntry('e1', { title: 'T' }, 1);
    answer('PATCH', '/entries/e1', { currentRevision: 3 }, { status: 409, statusText: 'Conflict' });

    const error = await saved.catch((e: unknown) => e);
    expect(error).toBeInstanceOf(EntryConflictError);
    expect((error as EntryConflictError).currentRevision).toBe(3);
  });

  it('pins, unpins, lists and reorders', async () => {
    const pin = repository.setEntryPinned('e1', true);
    answer('PUT', '/pins/e1');
    await pin;

    const unpin = repository.setEntryPinned('e1', false);
    answer('DELETE', '/pins/e1');
    await unpin;

    const listed = repository.listPinnedEntries();
    answer('GET', '/pins', [{ entryId: 'e1' }]);
    expect(await listed).toEqual([{ entryId: 'e1' }] as never);

    const reordered = repository.reorderPinnedEntries(['e2', 'e1']);
    expect(answer('PUT', '/pins/order').body).toEqual({ entryIds: ['e2', 'e1'] });
    await reordered;
  });

  it('knows whether an entry is pinned from the list of pins', async () => {
    const yes = repository.isEntryPinned('e1');
    answer('GET', '/pins', [{ entryId: 'e1' }]);
    expect(await yes).toBe(true);

    const no = repository.isEntryPinned('e9');
    answer('GET', '/pins', [{ entryId: 'e1' }]);
    expect(await no).toBe(false);
  });

  it('reports the pin limit as such', async () => {
    const pin = repository.setEntryPinned('e5', true);
    answer(
      'PUT',
      '/pins/e5',
      { code: 'PIN_LIMIT_REACHED' },
      { status: 409, statusText: 'Conflict' },
    );

    await expect(pin).rejects.toThrowError(PinLimitReachedError);
  });

  it('lists, keeps and restores versions', async () => {
    const listed = repository.listVersions('e1');
    answer('GET', '/entries/e1/versions', []);
    expect(await listed).toEqual([]);

    const kept = repository.createVersion('e1');
    answer('POST', '/entries/e1/versions', { id: 'v1' });
    expect(await kept).toEqual({ id: 'v1' } as never);

    const restored = repository.restoreVersion('e1', 'v1');
    answer('POST', '/entries/e1/versions/v1/restore', { id: 'e1', revision: 9 });
    expect((await restored).revision).toBe(9);
  });
});
