import { Directive, effect, ElementRef, inject, input } from '@angular/core';

/** Splits `text` at every occurrence of any of `terms` (ignoring case); odd entries are the matches. */
export function splitByTerms(text: string, terms: readonly string[]): string[] {
  const words = terms.filter(Boolean).sort((a, b) => b.length - a.length);
  if (words.length === 0) {
    return [text];
  }
  const pattern = words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  return text.split(new RegExp(`(${pattern})`, 'i'));
}

/**
 * Shows `text` with every search word marked, so it is clear why a logbook matched:
 * `<h2 [appHighlight]="title" [highlightTerms]="words"></h2>`. The element's content is written
 * here (text and `<mark>`s only), so it is never HTML from the data.
 */
@Directive({ selector: '[appHighlight]' })
export class Highlight {
  readonly appHighlight = input.required<string>();
  readonly highlightTerms = input<readonly string[]>([]);

  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  constructor() {
    effect(() => {
      const parts = splitByTerms(this.appHighlight() ?? '', this.highlightTerms());
      this.element.replaceChildren(
        ...parts.map((part, index) => {
          if (index % 2 === 0) {
            return document.createTextNode(part);
          }
          const mark = document.createElement('mark');
          mark.className = 'hit';
          mark.textContent = part;
          return mark;
        }),
      );
    });
  }
}
