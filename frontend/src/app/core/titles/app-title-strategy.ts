import { inject, Injectable } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';

export const APP_NAME = 'eLogbook';

/** "Page · eLogbook"; a page without a title of its own is just "eLogbook". */
export const tabTitle = (page?: string | null): string =>
  page ? `${page} · ${APP_NAME}` : APP_NAME;

/** Sets the tab title from the route's title. */
@Injectable({ providedIn: 'root' })
export class AppTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);

  override updateTitle(snapshot: RouterStateSnapshot): void {
    const page = this.buildTitle(snapshot);
    this.title.setTitle(tabTitle(page));
  }
}
