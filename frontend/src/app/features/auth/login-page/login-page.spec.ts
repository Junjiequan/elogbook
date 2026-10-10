import type { Mock } from 'vitest';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { TEST_USERS } from '../../../testing/test-users';
import type { User } from '../../../core/models/logbook.models';
import { ApiAuthService, AuthError } from '../../../core/auth/api-auth.service';
import { OAuthWidgets, type OAuthProvider } from '../../../core/auth/oauth-widgets';
import { Redirector } from '../../../core/auth/redirector';
import { provideFakeAuth } from '../../../testing/fake-auth';
import { LoginPage } from './login-page';

describe('LoginPage', () => {
  let fixture: ComponentFixture<LoginPage>;
  let auth: {
    user: ReturnType<typeof signal<User | null>>;
    signIn: Mock;
    signUp: Mock;
    oauthProvider: Mock;
    oauthLoginUrl: Mock;
    signInWithCredential: Mock;
  };
  let navigate: Mock;
  let redirect: Mock;
  let renderWidget: Mock;
  const el = () => fixture.nativeElement as HTMLElement;

  const create = async (
    inputs: {
      returnUrl?: string;
      oauthError?: string;
      oauth?: OAuthProvider | null;
      widgetFails?: boolean;
    } = {},
  ) => {
    auth = {
      user: signal<User | null>(null),
      signIn: vi.fn().mockName('signIn').mockResolvedValue(undefined),
      signUp: vi.fn().mockName('signUp').mockResolvedValue(undefined),
      oauthProvider: vi
        .fn()
        .mockName('oauthProvider')
        .mockResolvedValue(inputs.oauth ?? null),
      signInWithCredential: vi.fn().mockName('signInWithCredential').mockResolvedValue(undefined),
      oauthLoginUrl: vi
        .fn()
        .mockName('oauthLoginUrl')
        .mockImplementation((returnUrl?: string) => `/api/v1/auth/oauth/login?r=${returnUrl}`),
    };
    redirect = vi.fn().mockName('redirect');
    renderWidget = vi
      .fn()
      .mockName('render')
      .mockImplementation(() =>
        inputs.widgetFails ? Promise.reject(new Error('script blocked')) : Promise.resolve(),
      );
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideFakeAuth(),
        { provide: ApiAuthService, useValue: auth },
        { provide: Redirector, useValue: { to: redirect } },
        { provide: OAuthWidgets, useValue: { render: renderWidget } },
      ],
    });
    navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    fixture = TestBed.createComponent(LoginPage);
    if (inputs.returnUrl !== undefined) {
      fixture.componentRef.setInput('returnUrl', inputs.returnUrl);
    }
    if (inputs.oauthError !== undefined) {
      fixture.componentRef.setInput('oauthError', inputs.oauthError);
    }
    fixture.detectChanges();
    await fixture.whenStable();
    await settle(); // the provider's name arrives after the page is first drawn
  };

  const settle = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  const type = async (selector: string, value: string) => {
    const input = el().querySelector<HTMLInputElement>(selector)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    await settle();
  };

  const submit = () => el().querySelector<HTMLButtonElement>('button[type="submit"]')!;
  const modeToggle = (label: string) =>
    Array.from(el().querySelectorAll<HTMLButtonElement>('mat-button-toggle button')).find((b) =>
      b.textContent?.includes(label),
    )!;

  it('lets you switch between light and dark before signing in', async () => {
    await create();

    expect(el().querySelector('.corner button.trigger')).not.toBeNull();
  });

  it('signs in with the email and password, once both are valid', async () => {
    await create();
    expect(submit().disabled).toBe(true);

    await type('input[type="email"]', 'anna@example.org');
    await type('input[type="password"]', 'secret');
    expect(submit().disabled).toBe(false);
    submit().click();
    await settle();

    expect(auth.signIn).toHaveBeenCalledTimes(1);

    expect(auth.signIn).toHaveBeenCalledWith('anna@example.org', 'secret');
  });

  it('rejects an email address that is not one', async () => {
    await create();

    await type('input[type="email"]', 'not an address');
    await type('input[type="password"]', 'secret');

    expect(submit().disabled).toBe(true);
  });

  it('shows why a sign-in failed', async () => {
    await create();
    auth.signIn.mockRejectedValue(new AuthError('Incorrect email or password.'));

    await type('input[type="email"]', 'anna@example.org');
    await type('input[type="password"]', 'wrong');
    submit().click();
    await settle();

    expect(el().querySelector('[role="alert"]')!.textContent).toContain(
      'Incorrect email or password.',
    );
  });

  it('switches to sign-up, which needs a name and a password of at least 8 characters', async () => {
    await create();
    modeToggle('Sign up').click();
    await settle();

    await type('input[autocomplete="name"]', 'Anna Lindqvist');
    await type('input[type="email"]', 'anna@example.org');
    await type('input[type="password"]', 'short');
    expect(submit().disabled).toBe(true);

    await type('input[type="password"]', 'long enough');
    expect(submit().disabled).toBe(false);
    submit().click();
    await settle();

    expect(auth.signUp).toHaveBeenCalledTimes(1);

    expect(auth.signUp).toHaveBeenCalledWith('Anna Lindqvist', 'anna@example.org', 'long enough');
  });

  it('says why signing up failed, for example when the email is taken', async () => {
    await create();
    auth.signUp.mockRejectedValue(
      new AuthError('An account with this email already exists. Try signing in.'),
    );
    modeToggle('Sign up').click();
    await settle();

    await type('input[autocomplete="name"]', 'Anna Lindqvist');
    await type('input[type="email"]', 'anna@example.org');
    await type('input[type="password"]', 'long enough');
    submit().click();
    await settle();

    expect(el().querySelector('[role="alert"]')!.textContent).toContain('already exists');
  });

  describe('signing in through the identity provider (OAuth)', () => {
    const redirectButton = () => el().querySelector<HTMLButtonElement>('button.oauth');
    const widgetHost = () => el().querySelector<HTMLElement>('.widget');
    const google: OAuthProvider = {
      label: 'Google',
      widget: { kind: 'google', clientId: 'client-1.apps.googleusercontent.com' },
    };
    const ping: OAuthProvider = { label: 'Ping', widget: null };

    it('offers nothing when the API has no OAuth set up', async () => {
      await create({ oauth: null });

      expect(redirectButton()).toBeNull();
      expect(widgetHost()).toBeNull();
      expect(submit()).not.toBeNull(); // the password form is still there
    });

    it("draws the provider's own component when it has one, next to the password form", async () => {
      await create({ oauth: google });

      expect(widgetHost()).not.toBeNull();
      expect(renderWidget).toHaveBeenCalledTimes(1);
      expect(renderWidget).toHaveBeenCalledWith(google.widget, widgetHost(), expect.any(Function));
      expect(redirectButton()).toBeNull(); // not a copy of it
      expect(submit()).not.toBeNull();
    });

    it("signs in with what the provider's component hands over", async () => {
      await create({ oauth: google });
      const onCredential = renderWidget.mock.calls[0][2] as (credential: string) => void;

      onCredential('the-id-token');
      await settle();

      expect(auth.signInWithCredential).toHaveBeenCalledWith('the-id-token');
    });

    it('says why when the API refuses what the component handed over', async () => {
      await create({ oauth: google });
      auth.signInWithCredential.mockRejectedValue(
        new AuthError('Accounts with this email address are not allowed to sign in here.'),
      );

      (renderWidget.mock.calls[0][2] as (credential: string) => void)('token');
      await settle();

      expect(el().querySelector('[role="alert"]')!.textContent).toContain('not allowed');
    });

    it('uses the redirect button when the provider has no component of its own', async () => {
      await create({ oauth: ping });

      expect(renderWidget).not.toHaveBeenCalled();
      expect(widgetHost()).toBeNull();
      expect(redirectButton()!.textContent).toContain('Continue with Ping');
    });

    it('falls back to the redirect button when the component cannot be drawn', async () => {
      await create({ oauth: google, widgetFails: true });
      await settle();

      expect(redirectButton()!.textContent).toContain('Continue with Google');
    });

    it('leaves for the provider, remembering where the visitor was heading', async () => {
      await create({ oauth: ping, returnUrl: '/logbooks/abc' });

      redirectButton()!.click();

      expect(auth.oauthLoginUrl).toHaveBeenCalledWith('/logbooks/abc');
      expect(redirect).toHaveBeenCalledWith('/api/v1/auth/oauth/login?r=/logbooks/abc');
    });

    it('does not pass on a return address that leads away from the app', async () => {
      await create({ oauth: ping, returnUrl: '//evil.example' });

      redirectButton()!.click();

      expect(auth.oauthLoginUrl).toHaveBeenCalledWith('/logbooks');
    });

    it.each([
      ['denied', 'cancelled'],
      ['expired', 'took too long'],
      ['unverified', 'not verified'],
      ['conflict', 'different account'],
      ['not_allowed', 'not allowed'],
      ['no_account', 'no account'],
      ['unavailable', 'cannot be reached'],
      ['failed', 'did not work'],
      ['something-new', 'did not work'],
    ])('says why it did not work: %s', async (code, words) => {
      await create({ oauth: ping, oauthError: code });
      await settle();

      expect(el().querySelector('[role="alert"]')!.textContent).toContain(words);
    });
  });

  describe('after signing in', () => {
    const signedIn = async () => {
      auth.user.set(TEST_USERS[0]);
      await settle();
    };

    it('goes back to where the visitor was heading', async () => {
      await create({ returnUrl: '/logbooks/abc/entries/e1' });
      await signedIn();

      expect(navigate).toHaveBeenCalledWith('/logbooks/abc/entries/e1');
    });

    it('goes to the logbooks when there is nowhere to return to', async () => {
      await create();
      await signedIn();

      expect(navigate).toHaveBeenCalledWith('/logbooks');
    });

    for (const unsafe of ['//evil.example', 'https://evil.example', '/login?x=1']) {
      it(`never follows ${unsafe}`, async () => {
        await create({ returnUrl: unsafe });
        await signedIn();

        expect(navigate).toHaveBeenCalledWith('/logbooks');
      });
    }
  });
});
