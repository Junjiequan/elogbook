import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Truncated } from './truncated';

@Component({
  imports: [Truncated],
  template: `
    <div [style.width.px]="width()">
      <span
        class="text"
        appTruncated
        #t="appTruncated"
        [style]="
          clamp()
            ? 'display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden'
            : 'display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap'
        "
        >{{ text() }}</span
      >
      <output>{{ t.truncated() }}</output>
    </div>
  `,
})
class Host {
  readonly width = signal(500);
  readonly clamp = signal(false);
  readonly text = signal('A short description');
}

describe('Truncated', () => {
  let fixture: ComponentFixture<Host>;
  let host: Host;
  const result = () => fixture.nativeElement.querySelector('output').textContent.trim();

  const settle = async () => {
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 60)); // let ResizeObserver report
    fixture.detectChanges();
    await fixture.whenStable();
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    fixture = TestBed.createComponent(Host);
    host = fixture.componentInstance;
    await settle();
  });

  it('is false when the text fits', () => {
    expect(result()).toBe('false');
  });

  it('is true when the text is cut off, and false again once there is room', async () => {
    host.text.set(
      'A very long description that certainly does not fit inside a narrow column of text',
    );
    host.width.set(120);
    await settle();
    expect(result()).toBe('true');

    host.width.set(900);
    await settle();
    expect(result()).toBe('false');
  });

  it('also notices text cut off at the bottom, as with a line clamp', async () => {
    host.clamp.set(true);
    host.width.set(150);
    host.text.set('word '.repeat(60));
    await settle();
    expect(result()).toBe('true');

    host.text.set('two short lines');
    host.width.set(400);
    await settle();
    expect(result()).toBe('false');
  });

  it('ignores a pixel or two of rounding, which fractional screen scaling produces', async () => {
    host.clamp.set(true);
    host.width.set(400);
    host.text.set('two short lines');
    await settle();
    const text = fixture.nativeElement.querySelector('.text') as HTMLElement;

    // Three lines of content in a box three pixels too short: nothing is really cut off.
    text.style.cssText =
      'display: block; overflow: hidden; line-height: 20px; height: 57px; white-space: pre';
    text.textContent = 'one\ntwo\nthree';
    window.dispatchEvent(new Event('resize'));
    await settle();
    text.style.width = '399px'; // makes the ResizeObserver look again
    await settle();
    expect(result()).toBe('false');
  });
});
