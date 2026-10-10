import type { Mock } from 'vitest';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiAuthService, AuthError } from '../../../core/auth/api-auth.service';
import { OAuthCallback, safeReturnTo } from './oauth-callback';

describe('OAuthCallback', () => {
  let completeOAuth: Mock;
  let navigate: Mock;
  let navigateByUrl: Mock;

  const open = async (fragment: string | null, signInResult: 'ok' | 'fails' = 'ok') => {
    completeOAuth = vi
      .fn()
      .mockName('completeOAuth')
      .mockImplementation(() =>
        signInResult === 'ok'
          ? Promise.resolve()
          : Promise.reject(new AuthError('Something went wrong. Try again.')),
      );
    navigate = vi.fn().mockName('navigate').mockResolvedValue(true);
    navigateByUrl = vi.fn().mockName('navigateByUrl').mockResolvedValue(true);
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: ApiAuthService, useValue: { completeOAuth } },
        { provide: Router, useValue: { navigate, navigateByUrl } },
        { provide: ActivatedRoute, useValue: { snapshot: { fragment } } },
      ],
    });
    const fixture = TestBed.createComponent(OAuthCallback);
    fixture.detectChanges();
    await fixture.whenStable();
    await Promise.resolve();
  };

  it('signs in with the token from the address and goes where the person was heading', async () => {
    await open('access_token=abc&expires_in=28800&return_to=%2Flogbooks%2F1');

    expect(completeOAuth).toHaveBeenCalledWith('abc', 28800);
    expect(navigateByUrl).toHaveBeenCalledWith('/logbooks/1', { replaceUrl: true });
  });

  it('goes to the logbooks when there was nowhere in particular', async () => {
    await open('access_token=abc&expires_in=60');

    expect(navigateByUrl).toHaveBeenCalledWith('/logbooks', { replaceUrl: true });
  });

  it('never follows a return address that leads out of the app', async () => {
    await open('access_token=abc&expires_in=60&return_to=%2F%2Fevil.example');

    expect(navigateByUrl).toHaveBeenCalledWith('/logbooks', { replaceUrl: true });
  });

  it.each([null, '', 'expires_in=60', 'access_token=abc', 'access_token=abc&expires_in=zero'])(
    'goes back to the sign-in page when the address has no usable token: %j',
    async (fragment) => {
      await open(fragment);

      expect(completeOAuth).not.toHaveBeenCalled();
      expect(navigate).toHaveBeenCalledWith(['/login'], {
        queryParams: { oauthError: 'failed' },
        replaceUrl: true,
      });
    },
  );

  it('goes back to the sign-in page when the API does not accept the token', async () => {
    await open('access_token=forged&expires_in=60', 'fails');

    expect(navigateByUrl).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { oauthError: 'failed' },
      replaceUrl: true,
    });
  });
});

describe('safeReturnTo', () => {
  it.each([
    ['/logbooks/1/entries/2', '/logbooks/1/entries/2'],
    ['/login', '/logbooks'],
    ['//evil.example', '/logbooks'],
    ['https://evil.example', '/logbooks'],
    ['', '/logbooks'],
    [null, '/logbooks'],
  ])('%j -> %s', (input, expected) => {
    expect(safeReturnTo(input)).toBe(expected);
  });
});
