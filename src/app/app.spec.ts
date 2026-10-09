import { Component, provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { App } from './app';
import { provideFakeAuth } from './testing/fake-auth';

@Component({ template: 'page' })
class Page {}

describe('App shell', () => {
  let fixture: ComponentFixture<App>;
  const el = () => fixture.nativeElement as HTMLElement;
  const footer = () => el().querySelector('footer');
  const main = () => el().querySelector<HTMLElement>('main')!;

  const go = async (url: string) => {
    await TestBed.inject(Router).navigateByUrl(url);
    fixture.detectChanges();
    await fixture.whenStable();
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideFakeAuth(),
        provideRouter([
          { path: 'logbooks', component: Page },
          { path: 'logbooks/:id', component: Page, data: { fillsScreen: true } },
          { path: 'logbooks/:id/entries/:entry', component: Page, data: { fillsScreen: true } },
        ]),
      ],
    });
    fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  describe('no bar across the top', () => {
    it('has none: the page starts at the top, and the profile and colour mode live in each page’s corner', () => {
      expect(el().querySelector('header')).toBeNull();
      expect(el().querySelector('mat-toolbar')).toBeNull();
      expect(el().querySelector('.header-handle')).toBeNull();
    });
  });

  describe('footer', () => {
    it('shows on ordinary pages such as the logbook list', async () => {
      await go('/logbooks');

      expect(footer()).not.toBeNull();
      expect(footer()!.textContent).toContain('Open-source MVP');
      expect(footer()!.classList).toContain('no-print');
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
    it('always keeps room for it on ordinary pages, so the layout cannot shift sideways', async () => {
      await go('/logbooks');

      expect(getComputedStyle(main()).scrollbarGutter).toContain('stable');
    });

    it('is left out of the logbook content view, which scrolls inside itself', async () => {
      await go('/logbooks/abc');

      expect(main().classList).toContain('fills-screen');
      expect(getComputedStyle(main()).overflowY).toBe('hidden');
      expect(getComputedStyle(main()).scrollbarGutter).toBe('auto');
    });

    it('goes back to the ordinary kind when you leave the logbook', async () => {
      await go('/logbooks/abc');
      await go('/logbooks');

      expect(main().classList).not.toContain('fills-screen');
    });
  });
});
