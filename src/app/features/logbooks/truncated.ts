import { afterNextRender, DestroyRef, Directive, ElementRef, inject, signal } from '@angular/core';

/**
 * Tells whether the host's text is cut off, and keeps that up to date as the element is resized.
 * Use with `exportAs`: `<span appTruncated #t="appTruncated">`, then `t.truncated()`.
 * The host must hide its overflow: a single line with `text-overflow: ellipsis` is cut sideways, a
 * block with `-webkit-line-clamp` is cut at the bottom; both are detected.
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
    const { scrollWidth, clientWidth, scrollHeight, clientHeight } = this.element;
    // Screens with fractional scaling round widths and heights differently, so a pixel or two of
    // difference means nothing. Text is cut when it overflows sideways, or when at least half a line is
    // missing at the bottom (a real clamp hides whole lines).
    const lineHeight = parseFloat(getComputedStyle(this.element).lineHeight);
    const slack = Math.max(2, (Number.isNaN(lineHeight) ? 16 : lineHeight) / 2);
    this._truncated.set(scrollWidth > clientWidth + 1 || scrollHeight > clientHeight + slack);
  }
}
