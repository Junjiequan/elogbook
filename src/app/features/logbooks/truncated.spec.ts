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
        style="display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap"
        >{{ text() }}</span
      >
      <output>{{ t.truncated() }}</output>
    </div>
  `,
})
class Host {
  readonly width = signal(500);
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
});
