import { afterNextRender, DestroyRef, Directive, ElementRef, inject, signal } from '@angular/core';

/**
 * Tells whether the host's text is cut off with an ellipsis, and keeps that up to date as the
 * element is resized. Use with `exportAs`: `<span appTruncated #t="appTruncated">`, then `t.truncated()`.
 * The host must be `display: block` (or similar) with `overflow: hidden; text-overflow: ellipsis`.
 */
@Directive({ selector: '[appTruncated]', exportAs: 'appTruncated' })
export class Truncated {
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly _truncated = signal(false);

  readonly truncated = this._truncated.asReadonly();

  constructor() {
    const observer = new ResizeObserver(() => this.measure());
    observer.observe(this.element);
    inject(DestroyRef).onDestroy(() => observer.disconnect());
    afterNextRender(() => this.measure());
  }

  private measure(): void {
    this._truncated.set(this.element.scrollWidth > this.element.clientWidth + 1);
  }
}
