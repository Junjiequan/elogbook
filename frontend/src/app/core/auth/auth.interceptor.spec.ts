import type { Mock } from 'vitest';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { ApiAuthService } from './api-auth.service';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  let http: HttpClient;
  let controller: HttpTestingController;
  let token: ReturnType<typeof signal<string | null>>;
  let auth: {
    token: typeof token;
    expire: Mock;
  };
  let navigate: Mock;

  beforeEach(() => {
    token = signal<string | null>('abc');
    auth = { token, expire: vi.fn().mockName('expire') };
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: ApiAuthService, useValue: auth },
      ],
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  });

  afterEach(() => controller.verify());

  it('sends the token with every call to the API', () => {
    http.get('/api/v1/logbooks').subscribe();

    const request = controller.expectOne('/api/v1/logbooks');
    expect(request.request.headers.get('Authorization')).toBe('Bearer abc');
    request.flush([]);
  });

  it('never sends the token anywhere else', () => {
    http.get('https://elsewhere.example/data').subscribe();

    const request = controller.expectOne('https://elsewhere.example/data');
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({});
  });

  it('sends nothing when nobody is signed in', () => {
    token.set(null);
    http.post('/api/v1/auth/login', {}).subscribe();

    const request = controller.expectOne('/api/v1/auth/login');
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({});
  });

  it('signs out and goes to the sign-in page when the API refuses the token', () => {
    vi.spyOn(TestBed.inject(Router), 'url', 'get').mockReturnValue('/logbooks/l1');
    let failed: unknown;
    http.get('/api/v1/logbooks').subscribe({ error: (e) => (failed = e) });

    controller.expectOne('/api/v1/logbooks').flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(auth.expire).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/logbooks/l1' },
    });
    expect(failed).toBeTruthy();
  });

  it('does not sign anyone out for other errors', () => {
    http.get('/api/v1/logbooks').subscribe({ error: () => undefined });

    controller.expectOne('/api/v1/logbooks').flush({}, { status: 500, statusText: 'Server Error' });

    expect(auth.expire).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('does not treat a wrong password at sign-in as an expired session', () => {
    token.set(null);
    http.post('/api/v1/auth/login', {}).subscribe({ error: () => undefined });

    controller
      .expectOne('/api/v1/auth/login')
      .flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(auth.expire).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });
});
