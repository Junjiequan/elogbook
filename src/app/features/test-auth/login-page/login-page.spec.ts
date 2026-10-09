import { provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { DEMO_USERS } from '../../../../demo/demo-users';
import type { User } from '../../../core/models/logbook.models';
import { DEMO_PASSWORD, GOOGLE_CLIENT_ID } from '../test-auth.config';
import { AuthError, TestAuthService } from '../test-auth.service';
import { provideFakeAuth } from '../../../testing/fake-auth';
import { LoginPage } from './login-page';

describe('LoginPage', () => {
  let fixture: ComponentFixture<LoginPage>;
  let auth: {
    user: ReturnType<typeof signal<User | null>>;
    signIn: jasmine.Spy;
    signUp: jasmine.Spy;
    signInWithGoogle: jasmine.Spy;
  };
  let navigate: jasmine.Spy;
  const el = () => fixture.nativeElement as HTMLElement;

  const create = async (inputs: { returnUrl?: string } = {}, googleClientId = '') => {
    auth = {
      user: signal<User | null>(null),
      signIn: jasmine.createSpy('signIn').and.resolveTo(),
      signUp: jasmine.createSpy('signUp').and.resolveTo(),
      signInWithGoogle: jasmine.createSpy('signInWithGoogle'),
    };
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideFakeAuth(),
        { provide: TestAuthService, useValue: auth },
        { provide: GOOGLE_CLIENT_ID, useValue: googleClientId },
      ],
    });
    navigate = spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);
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
    expect(submit().disabled).toBeTrue();

    await type('input[type="email"]', 'anna@example.org');
    await type('input[type="password"]', 'secret');
    expect(submit().disabled).toBeFalse();
    submit().click();
    await settle();

    expect(auth.signIn).toHaveBeenCalledOnceWith('anna@example.org', 'secret');
  });

  it('rejects an email address that is not one', async () => {
    await create();

    await type('input[type="email"]', 'not an address');
    await type('input[type="password"]', 'secret');

    expect(submit().disabled).toBeTrue();
  });

  it('shows why a sign-in failed', async () => {
    await create();
    auth.signIn.and.rejectWith(new AuthError('Incorrect email or password.'));

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
    expect(submit().disabled).toBeTrue();

    await type('input[type="password"]', 'long enough');
    expect(submit().disabled).toBeFalse();
    submit().click();
    await settle();

    expect(auth.signUp).toHaveBeenCalledOnceWith(
      'Anna Lindqvist',
      'anna@example.org',
      'long enough',
    );
  });

  it('offers a button for each demo account that signs in with the demo password', async () => {
    await create();

    const buttons = Array.from(el().querySelectorAll<HTMLButtonElement>('.demo button'));
    expect(buttons.map((b) => b.textContent?.trim())).toEqual(DEMO_USERS.map((u) => u.name));

    buttons[1].click();
    await settle();
    expect(auth.signIn).toHaveBeenCalledOnceWith(DEMO_USERS[1].email, DEMO_PASSWORD);
  });

  it('shows the Google button only when a client id is configured', async () => {
    await create();
    expect(el().querySelector('.google')).toBeNull();

    await create({}, 'client-id');
    expect(el().querySelector('.google')).not.toBeNull();
  });

  describe('after signing in', () => {
    const signedIn = async () => {
      auth.user.set(DEMO_USERS[0]);
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
