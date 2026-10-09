import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { Router, TitleStrategy, provideRouter } from '@angular/router';
import { AppTitleStrategy } from './app-title-strategy';

describe('AppTitleStrategy', () => {
  const setup = () => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([
          { path: 'logbooks', title: 'Logbooks', children: [] },
          { path: 'untitled', children: [] },
        ]),
        { provide: TitleStrategy, useClass: AppTitleStrategy },
      ],
    });
    return { router: TestBed.inject(Router), title: TestBed.inject(Title) };
  };

  it('puts the app name after the page title', async () => {
    const { router, title } = setup();

    await router.navigateByUrl('/logbooks');

    expect(title.getTitle()).toBe('Logbooks · eLogbook');
  });

  it('falls back to the app name instead of keeping the previous page’s title', async () => {
    const { router, title } = setup();
    await router.navigateByUrl('/logbooks');

    await router.navigateByUrl('/untitled');

    expect(title.getTitle()).toBe('eLogbook');
  });
});
