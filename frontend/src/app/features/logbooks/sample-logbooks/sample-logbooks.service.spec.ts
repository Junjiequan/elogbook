import type { Mock } from 'vitest';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideFakeAuth } from '../../../testing/fake-auth';
import { LogbooksStore } from '../logbooks.store';
import { SampleLogbooks } from './sample-logbooks.service';

describe('SampleLogbooks', () => {
  let http: HttpTestingController;
  let store: {
    load: Mock;
  };
  let samples: SampleLogbooks;

  beforeEach(async () => {
    store = { load: vi.fn().mockName('load').mockResolvedValue(undefined) };
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideFakeAuth(),
        { provide: LogbooksStore, useValue: store },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    samples = TestBed.inject(SampleLogbooks);
    TestBed.tick(); // the effect that asks once someone is signed in
  });

  afterEach(() => http.verify());

  const status = async (answer: { body?: object; status?: number }) => {
    http.expectOne('/api/v1/demo').flush(answer.body ?? {}, {
      status: answer.status ?? 200,
      statusText: '',
    });
    await Promise.resolve();
    await Promise.resolve();
  };

  it('asks the server, once signed in, how many sample logbooks there are', async () => {
    await status({ body: { logbooks: 15 } });

    expect(samples.available()).toBe(true);
    expect(samples.count()).toBe(15);
  });

  it('is not offered when the server has it switched off', async () => {
    await status({ status: 404 });

    expect(samples.available()).toBe(false);
  });

  it('adds the sample logbooks, then reloads the list and the count', async () => {
    await status({ body: { logbooks: 0 } });

    const added = samples.add();
    expect(samples.busy()).toBe(true);
    http.expectOne({ method: 'POST', url: '/api/v1/demo' }).flush({ created: 15, total: 15 });
    await Promise.resolve();
    await Promise.resolve();
    await status({ body: { logbooks: 15 } });
    await added;

    expect(store.load).toHaveBeenCalledTimes(1);
    expect(samples.count()).toBe(15);
    expect(samples.busy()).toBe(false);
  });

  it('removes them, then reloads the list and the count', async () => {
    await status({ body: { logbooks: 15 } });

    const removed = samples.remove();
    http
      .expectOne({ method: 'DELETE', url: '/api/v1/demo' })
      .flush(null, { status: 204, statusText: '' });
    await Promise.resolve();
    await Promise.resolve();
    await status({ body: { logbooks: 0 } });
    await removed;

    expect(store.load).toHaveBeenCalledTimes(1);
    expect(samples.count()).toBe(0);
  });

  it('is no longer busy when a change fails', async () => {
    await status({ body: { logbooks: 0 } });

    const added = samples.add();
    http
      .expectOne({ method: 'POST', url: '/api/v1/demo' })
      .flush({}, { status: 500, statusText: '' });

    await expect(added).rejects.toThrow();
    expect(samples.busy()).toBe(false);
    expect(store.load).not.toHaveBeenCalled();
  });
});
