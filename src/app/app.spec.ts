import { Component, provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { App, HEADER_COLLAPSED_KEY } from './app';
import { provideFakeAuth } from './testing/fake-auth';

@Component({ template: 'page' })
class Page {}

describe('App shell', () => {
  let fixture: ComponentFixture<App>;
  const el = () => fixture.nativeElement as HTMLElement;
  const header = () => el().querySelector('.shell-header')!;
  const footer = () => el().querySelector('footer');

  const go = async (url: string) => {
    await TestBed.inject(Router).navigateByUrl(url);
    fixture.detectChanges();
    await fixture.whenStable();
  };

  const click = async (label: string) => {
    el().querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!.click();
    fixture.detectChanges();
    await fixture.whenStable();
  };

  beforeEach(async () => {
    localStorage.removeItem(HEADER_COLLAPSED_KEY);
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideFakeAuth(),
        provideRouter([
          { path: 'logbooks', component: Page },
          { path: 'logbooks/:id', component: Page, data: { hideFooter: true } },
          { path: 'logbooks/:id/entries/:entry', component: Page, data: { hideFooter: true } },
        ]),
      ],
    });
    fixture = TestBed.createComponent(App);
    fixture.detectChanges();
  });

  afterEach(() => localStorage.removeItem(HEADER_COLLAPSED_KEY));

  describe('footer', () => {
    it('shows on ordinary pages such as the logbook list', async () => {
      await go('/logbooks');

      expect(footer()).not.toBeNull();
    });

    it('is left out of the logbook content view, including its entries', async () => {
      await go('/logbooks/abc');
      expect(footer()).toBeNull();

      await go('/logbooks/abc/entries/e1');
      expect(footer()).toBeNull();
    });

    it('comes back when you leave the logbook', async () => {
      await go('/logbooks/abc');
      await go('/logbooks');

      expect(footer()).not.toBeNull();
    });
  });

  describe('page scrollbar', () => {
    const main = () => el().querySelector<HTMLElement>('main')!;

    it('always keeps room for it on ordinary pages, so hiding the header cannot shift the layout', async () => {
      await go('/logbooks');

      expect(getComputedStyle(main()).scrollbarGutter).toContain('stable');
    });

    it('is left out of the logbook content view, which scrolls inside itself', async () => {
      await go('/logbooks/abc');

      expect(main().classList).toContain('fills-screen');
      expect(getComputedStyle(main()).overflowY).toBe('hidden');
      expect(getComputedStyle(main()).scrollbarGutter).toBe('auto');
    });
  });

  describe('header', () => {
    it('starts open, with the toggle already in place', () => {
      expect(header().classList).not.toContain('collapsed');
      expect(el().querySelector('.header-handle')).not.toBeNull();
    });

    it('folds away, leaving a handle to bring it back', async () => {
      await click('Hide header');

      expect(header().classList).toContain('collapsed');
      expect(el().querySelector('.shell-header-inner')!.hasAttribute('inert')).toBeTrue();
      expect(el().querySelector('.header-handle')!.getAttribute('aria-label')).toBe('Show header');

      await click('Show header');
      expect(header().classList).not.toContain('collapsed');
      expect(el().querySelector('.header-handle')!.getAttribute('aria-label')).toBe('Hide header');
      expect(el().querySelector('.shell-header-inner')!.hasAttribute('inert')).toBeFalse();
    });

    it('hides and shows with the same button in the same place', async () => {
      const handle = el().querySelector<HTMLElement>('.header-handle')!;
      const before = handle.getBoundingClientRect();

      await click('Hide header');
      const after = handle.getBoundingClientRect();

      expect(el().querySelectorAll('.header-handle').length).toBe(1);
      expect(after.left).toBe(before.left);
      expect(after.top).toBe(before.top);
    });

    it('is a small tab at the top centre, and the page gets the whole height', async () => {
      await click('Hide header');

      const handle = el().querySelector<HTMLElement>('.header-handle')!;
      const box = handle.getBoundingClientRect();
      expect(getComputedStyle(handle).position).toBe('fixed');
      expect(box.top).toBe(0);
      expect(box.width).toBeLessThanOrEqual(80);
      expect(box.height).toBeLessThanOrEqual(24); // small enough to sit above the title text
      // centred in the visible area (innerWidth would include a scrollbar)
      expect(
        Math.abs(box.left + box.width / 2 - document.documentElement.clientWidth / 2),
      ).toBeLessThan(2);
      expect(el().querySelector('.shell-header')!.getBoundingClientRect().height).toBe(0);
    });

    it('has no coloured border line under it', () => {
      expect(getComputedStyle(el().querySelector('.shell-bar')!).borderBottomWidth).toBe('0px');
    });

    it('remembers being collapsed', async () => {
      await click('Hide header');
      expect(localStorage.getItem(HEADER_COLLAPSED_KEY)).toBe('true');

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [provideZonelessChangeDetection(), provideFakeAuth(), provideRouter([])],
      });
      fixture = TestBed.createComponent(App);
      fixture.detectChanges();

      expect(header().classList).toContain('collapsed');
    });
  });
});
