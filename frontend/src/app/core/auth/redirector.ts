import { Injectable } from '@angular/core';

/** Leaves the app for another address; a class so tests can stub it. */
@Injectable({ providedIn: 'root' })
export class Redirector {
  to(url: string): void {
    window.location.assign(url);
  }
}
