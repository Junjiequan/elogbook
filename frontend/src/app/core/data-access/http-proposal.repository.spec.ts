import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { TEST_PROPOSALS } from '../../testing/test-proposals';
import { HttpProposalRepository } from './http-proposal.repository';

describe('HttpProposalRepository', () => {
  it('asks the API for the proposals', async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), HttpProposalRepository],
    });
    const http = TestBed.inject(HttpTestingController);

    const listed = TestBed.inject(HttpProposalRepository).list();
    const request = http.expectOne('/api/v1/proposals');
    expect(request.request.method).toBe('GET');
    request.flush(TEST_PROPOSALS);

    expect(await listed).toEqual(TEST_PROPOSALS);
    http.verify();
  });
});
