import { Injectable, signal } from '@angular/core';

/** Remembers which popover is pinned. There is only one slot, so pinning a card unpins the previous one. */
@Injectable({ providedIn: 'root' })
export class PopoverPin {
  private readonly _pinned = signal<object | null>(null);

  readonly pinned = this._pinned.asReadonly();

  isPinned(owner: object): boolean {
    return this._pinned() === owner;
  }

  toggle(owner: object): void {
    this._pinned.update((current) => (current === owner ? null : owner));
  }

  release(owner: object): void {
    this._pinned.update((current) => (current === owner ? null : current));
  }
}
