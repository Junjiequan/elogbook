import type { Mock } from 'vitest';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { TEST_USERS } from '../../../testing/test-users';
import type { User } from '../../../core/models/logbook.models';
import { ApiAuthService, AuthError } from '../../../core/auth/api-auth.service';
import { provideFakeAuth } from '../../../testing/fake-auth';
import { LoginPage } from './login-page';

describe('LoginPage', () => {
  let fixture: ComponentFixture<LoginPage>;
  let auth: {
    user: ReturnType<typeof signal<User | null>>;
    signIn: Mock;
    signUp: Mock;
  };
  let navigate: Mock;
  const el = () => fixture.nativeElement as HTMLElement;

  const create = async (
    inputs: {
      returnUrl?: string;
    } = {},
  ) => {
    auth = {
      user: signal<User | null>(null),
      signIn: vi.fn().mockName('signIn').mockResolvedValue(undefined),
      signUp: vi.fn().mockName('signUp').mockResolvedValue(undefined),
    };
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideFakeAuth(),
        { provide: ApiAuthService, useValue: auth },
      ],
    });
    navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    fixture = TestBed.createComponent(LoginPage);
    if (inputs.returnUrl !== undefined) {
      fixture.componentRef.setInput('returnUrl', inputs.returnUrl);
    }
    fixture.detectChanges();
    await fixture.whenStable();
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

  it('no longer offers test accounts, a Google button or a "test only" notice', async () => {
    await create();

    expect(el().querySelector('.demo, .google, .notice')).toBeNull();
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
