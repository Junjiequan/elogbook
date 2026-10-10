import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { ThemeService } from '../../core/theme/theme.service';
import { DEMO_USERS } from '../../../demo/demo-users';
import { provideFakeAuth } from '../../testing/fake-auth';
import { UserControls } from './user-controls';

describe('UserControls', () => {
  let fixture: ComponentFixture<UserControls>;
  const el = () => fixture.nativeElement as HTMLElement;
  const trigger = () => el().querySelector<HTMLButtonElement>('button.trigger')!;
  const panel = () => document.querySelector<HTMLElement>('.cdk-overlay-container .card');
  const settle = async (ms = 0) => {
    await new Promise((resolve) => setTimeout(resolve, ms));
    fixture.detectChanges();
    await fixture.whenStable();
  };

  const create = async (options: { admin?: boolean } = {}) => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideFakeAuth(DEMO_USERS[0], { admin: options.admin }),
      ],
    });
    fixture = TestBed.createComponent(UserControls);
    fixture.detectChanges();
    await fixture.whenStable();
  };

  afterEach(() => {
    fixture?.destroy();
    localStorage.removeItem('elogbook.theme');
  });

  it('is a single icon, and nothing else until it is used', async () => {
    await create();

    expect(el().querySelectorAll('button').length).toBe(1);
    expect(trigger().getAttribute('aria-label')).toBe('Account and appearance');
    expect(panel()).toBeNull();
  });

  it('opens a panel when the mouse rests on the icon, quickly, without a pin', async () => {
    await create();

    el().querySelector('.anchor')!.dispatchEvent(new MouseEvent('mouseenter'));
    await settle(220);

    expect(panel()).not.toBeNull();
    expect(panel()!.querySelector('button.pin')).toBeNull();
  });

  it('shows who is signed in, the colour modes and a way to sign out', async () => {
    await create({ admin: true });
    trigger().click();
    await settle();

    expect(panel()!.querySelector('h3')!.textContent).toBe(DEMO_USERS[0].name);
    expect(panel()!.textContent).toContain(DEMO_USERS[0].email);
    expect(panel()!.textContent).toContain('Administrator');
    const modes = Array.from(panel()!.querySelectorAll('.mode')).map((b) => b.textContent?.trim());
    expect(modes).toEqual(['light_mode Light', 'dark_mode Dark']);
    expect(panel()!.querySelector('.sign-out')!.textContent).toContain('Sign out');
  });

  it('switches the colour mode, and shows which one is on', async () => {
    await create();
    const theme = TestBed.inject(ThemeService);
    theme.set('light');
    trigger().click();
    await settle();
    const [light, dark] = Array.from(panel()!.querySelectorAll<HTMLButtonElement>('.mode'));
    expect(light.getAttribute('aria-pressed')).toBe('true');
    expect(dark.getAttribute('aria-pressed')).toBe('false');

    dark.click();
    await settle();

    expect(theme.mode()).toBe('dark');
    expect(panel()!.querySelectorAll('.mode')[1].getAttribute('aria-pressed')).toBe('true');
  });

  it('signs out and goes to the login page', async () => {
    await create();
    const signOut = spyOn(TestBed.inject(AuthService), 'signOut');
    const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    trigger().click();
    await settle();

    panel()!.querySelector<HTMLButtonElement>('.sign-out')!.click();

    expect(signOut).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(['/login']);
  });

  it('puts the keyboard focus inside the panel when it is opened by a key or click, and Esc closes it', async () => {
    await create();
    trigger().focus();
    trigger().click();
    await settle(50);

    expect(panel()!.contains(document.activeElement)).toBeTrue();

    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await settle();
    expect(panel()).toBeNull();
  });

  it('is only a colour-mode switch when nobody is signed in', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        {
          provide: AuthService,
          useValue: { user: () => null, isAdmin: () => false, signOut: () => undefined },
        },
      ],
    });
    fixture = TestBed.createComponent(UserControls);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(trigger().getAttribute('aria-label')).toBe('Appearance');
    trigger().click();
    await settle();
    expect(panel()!.querySelectorAll('.mode').length).toBe(2);
    expect(panel()!.querySelector('.sign-out')).toBeNull();
  });
});
