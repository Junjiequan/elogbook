import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { LogbookRepository } from '../../core/data-access/logbook.repository';
import type { Entry, Logbook } from '../../core/models/logbook.models';
import { LogbooksStore, type LoadStatus } from '../logbooks/logbooks.store';
import { entryTitle, exportTitle, logbookTitle } from './logbook-titles';

const book = { id: 'l1', title: 'LoKI beamtime' } as Logbook;

describe('page titles of a logbook', () => {
  const setup = (
    options: {
      status?: LoadStatus;
      entry?: Partial<Entry> | undefined;
    } = {},
  ) => {
    const status = signal<LoadStatus>(options.status ?? 'ready');
    const repo = {
      getEntry: vi.fn().mockName('LogbookRepository.getEntry'),
    };
    repo.getEntry.mockResolvedValue(options.entry as Entry | undefined);
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: LogbookRepository, useValue: repo },
        { provide: LogbooksStore, useValue: { status, logbooks: signal([book]) } },
      ],
    });
    return { status };
  };

  const resolve = (fn: typeof logbookTitle, params: Record<string, string>) =>
    TestBed.runInInjectionContext(() =>
      fn({ params } as unknown as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    ) as Promise<string>;

  it('names the logbook page after the logbook', async () => {
    setup();

    expect(await resolve(logbookTitle, { logbookId: 'l1' })).toBe('LoKI beamtime');
  });

  it('waits for the logbooks to load before naming it', async () => {
    const { status } = setup({ status: 'loading' });

    const title = resolve(logbookTitle, { logbookId: 'l1' });
    status.set('ready');

    expect(await title).toBe('LoKI beamtime');
  });

  it('falls back to a plain name for an unknown logbook', async () => {
    setup();

    expect(await resolve(logbookTitle, { logbookId: 'nope' })).toBe('Logbook');
  });

  it('names the export page, so it never lingers after going back to the logbook', async () => {
    setup();

    expect(await resolve(exportTitle, { logbookId: 'l1' })).toBe('Export · LoKI beamtime');
    expect(await resolve(exportTitle, { logbookId: 'nope' })).toBe('Export logbook');
  });

  it('names an entry after itself and its logbook', async () => {
    setup({ entry: { title: 'Day 1' } });

    expect(await resolve(entryTitle, { logbookId: 'l1', entryId: 'e1' })).toBe(
      'Day 1 · LoKI beamtime',
    );
  });

  it('calls an untitled entry "Untitled entry"', async () => {
    setup({ entry: { title: '' } });

    expect(await resolve(entryTitle, { logbookId: 'l1', entryId: 'e1' })).toBe(
      'Untitled entry · LoKI beamtime',
    );
  });
});
