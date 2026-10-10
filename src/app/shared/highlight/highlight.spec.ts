import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Highlight, splitByTerms } from './highlight';

@Component({
  imports: [Highlight],
  template: `<p [appHighlight]="text()" [highlightTerms]="terms()"></p>`,
})
class Host {
  readonly text = signal('LoKI beamtime 2026-0412 – SDS micelles');
  readonly terms = signal<string[]>([]);
}

describe('splitByTerms', () => {
  it('returns the text whole when there is nothing to find', () => {
    expect(splitByTerms('abc', [])).toEqual(['abc']);
  });

  it('cuts the text at every match, ignoring case, matches at the odd places', () => {
    expect(splitByTerms('LoKI and loki', ['loki'])).toEqual(['', 'LoKI', ' and ', 'loki', '']);
  });

  it('takes the longer word first, so "micelle" is not cut by "mic"', () => {
    expect(splitByTerms('micelles', ['mic', 'micelle'])).toEqual(['', 'micelle', 's']);
  });

  it('treats characters like ( and . as plain text', () => {
    expect(splitByTerms('a (b) c', ['(b)'])).toEqual(['a ', '(b)', ' c']);
    expect(splitByTerms('v1x2', ['1.2'])).toEqual(['v1x2']);
  });
});

describe('Highlight', () => {
  const render = async (terms: string[]) => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.terms.set(terms);
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture;
  };
  const marks = (root: HTMLElement) =>
    Array.from(root.querySelectorAll('mark')).map((m) => m.textContent);

  it('writes the text as it is when there are no search words', async () => {
    const fixture = await render([]);

    const p = fixture.nativeElement.querySelector('p') as HTMLElement;
    expect(p.textContent).toBe('LoKI beamtime 2026-0412 – SDS micelles');
    expect(p.querySelector('mark')).toBeNull();
  });

  it('marks each search word wherever it occurs, without changing the text', async () => {
    const fixture = await render(['loki', 'sds']);

    const p = fixture.nativeElement.querySelector('p') as HTMLElement;
    expect(marks(p)).toEqual(['LoKI', 'SDS']);
    expect(p.textContent).toBe('LoKI beamtime 2026-0412 – SDS micelles');
  });

  it('follows the words as they change', async () => {
    const fixture = await render(['loki']);

    fixture.componentInstance.terms.set(['micelles']);
    fixture.detectChanges();
    await fixture.whenStable();

    const p = fixture.nativeElement.querySelector('p') as HTMLElement;
    expect(marks(p)).toEqual(['micelles']);
  });

  it('never turns the text into markup', async () => {
    const fixture = await render(['b']);
    fixture.componentInstance.text.set('<b>bold</b>');
    fixture.detectChanges();
    await fixture.whenStable();

    const p = fixture.nativeElement.querySelector('p') as HTMLElement;
    expect(p.querySelector('b')).toBeNull();
    expect(p.textContent).toBe('<b>bold</b>');
  });
});
