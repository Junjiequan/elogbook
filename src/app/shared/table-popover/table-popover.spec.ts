import { Component, provideZonelessChangeDetection, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  FOCUS_OPEN_DELAY_MS,
  HOVER_CLOSE_DELAY_MS,
  HOVER_OPEN_DELAY_MS,
  TablePopover,
} from './table-popover';

@Component({
  imports: [TablePopover],
  template: `
    <app-table-popover
      #first
      heading="LoKI beamtime"
      text="First paragraph.&#10;&#10;Second paragraph."
      triggerIcon="info_outline"
      triggerLabel="Show the description"
      [enabled]="enabled"
      [pinnable]="pinnable"
    />
    <app-table-popover #second heading="Second" text="Another text" triggerIcon="info_outline" />
    <app-table-popover #custom heading="Members" icon="group">
      <a class="own-trigger" href="#members">Own trigger</a>
      <ul popoverBody class="own-body">
        <li>Anna</li>
      </ul>
    </app-table-popover>
  `,
})
class Host {
  enabled = true;
  pinnable = true;
  readonly first = viewChild.required<TablePopover>('first');
  readonly custom = viewChild.required<TablePopover>('custom');
}

describe('TablePopover', () => {
  let fixture: ComponentFixture<Host>;
  const el = () => fixture.nativeElement as HTMLElement;
  const triggers = () => Array.from(el().querySelectorAll<HTMLButtonElement>('button.trigger'));
  const cards = () =>
    Array.from(document.querySelectorAll<HTMLElement>('.cdk-overlay-container .card'));
  const card = () => cards()[0] ?? null;
  const pinButton = () => document.querySelector<HTMLButtonElement>('.card button.pin');
  const settle = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
  };
  const wait = async (ms: number) => {
    await new Promise((resolve) => setTimeout(resolve, ms + 40));
    await settle();
  };
  const hover = (target: Element) => target.dispatchEvent(new MouseEvent('mouseenter'));
  const leave = (target: Element) => target.dispatchEvent(new MouseEvent('mouseleave'));
  const anchorOf = (index: number) => el().querySelectorAll('.anchor')[index];

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    fixture = TestBed.createComponent(Host);
    await settle();
  });

  afterEach(() => fixture.destroy());

  describe('the icon trigger', () => {
    it('is a button with the given name, closed to begin with', () => {
      expect(triggers()[0].getAttribute('aria-label')).toBe('Show the description');
      expect(triggers()[0].getAttribute('aria-expanded')).toBe('false');
      expect(card()).toBeNull();
    });

    it('previews the card while the mouse is over it, and closes when the mouse leaves', async () => {
      hover(anchorOf(0));
      await wait(HOVER_OPEN_DELAY_MS);

      expect(card().textContent).toContain('LoKI beamtime');
      expect(card().textContent).toContain('First paragraph.');
      expect(card().textContent).toContain('Click the pin to keep this open');

      leave(anchorOf(0));
      await wait(HOVER_CLOSE_DELAY_MS);
      expect(card()).toBeNull();
    });

    it('stays open while the mouse is on the card, so its text can be read and selected', async () => {
      hover(anchorOf(0));
      await wait(HOVER_OPEN_DELAY_MS);

      leave(anchorOf(0));
      hover(card());
      await wait(HOVER_CLOSE_DELAY_MS);
      expect(card()).not.toBeNull();

      leave(card());
      await wait(HOVER_CLOSE_DELAY_MS);
      expect(card()).toBeNull();
    });

    it('does not open while the pointer is still moving over it, only once it rests', async () => {
      hover(anchorOf(0));
      for (let i = 0; i < 4; i++) {
        await new Promise((resolve) => setTimeout(resolve, HOVER_OPEN_DELAY_MS * 0.6));
        anchorOf(0).dispatchEvent(new MouseEvent('mousemove'));
      }
      await settle();
      expect(card()).toBeNull(); // 2.4 delays have passed, but every move started the wait again

      await wait(HOVER_OPEN_DELAY_MS);
      expect(card()).not.toBeNull();
    });

    it('does not open at all when the pointer only passes through', async () => {
      hover(anchorOf(0));
      await new Promise((resolve) => setTimeout(resolve, HOVER_OPEN_DELAY_MS * 0.5));
      leave(anchorOf(0));
      await wait(HOVER_OPEN_DELAY_MS);

      expect(card()).toBeNull();
    });

    it('opens quickly for keyboard focus, which is deliberate', async () => {
      anchorOf(0).dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      await wait(FOCUS_OPEN_DELAY_MS);

      expect(card()).not.toBeNull();
    });

    it('opens on a click too, for touch screens, and a click elsewhere closes it again', async () => {
      triggers()[0].click();
      await settle();
      expect(card()).not.toBeNull();

      document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await settle();
      expect(card()).toBeNull();
    });

    it('keeps the click from reaching the table row that contains it', () => {
      const rowClick = jasmine.createSpy('rowClick');
      el().addEventListener('click', rowClick);

      triggers()[0].click();

      expect(rowClick).not.toHaveBeenCalled();
    });
  });

  describe('pinning', () => {
    const open = async (index = 0) => {
      hover(anchorOf(index));
      await wait(HOVER_OPEN_DELAY_MS);
    };

    it('is done with the pin button on the card, which keeps the card open after the mouse leaves', async () => {
      await open();
      pinButton()!.click();
      await settle();

      expect(pinButton()!.getAttribute('aria-pressed')).toBe('true');
      expect(card().textContent).toContain('Pinned');

      leave(anchorOf(0));
      leave(card());
      await wait(HOVER_CLOSE_DELAY_MS);
      expect(card()).not.toBeNull();
    });

    it('looks different from the page under it: an arrow, a header band, and a heavier look when pinned', async () => {
      await open();
      const cardEl = card()!;

      expect(cardEl.querySelector('.arrow')).not.toBeNull();
      expect(getComputedStyle(cardEl.querySelector('header')!).backgroundColor).not.toBe(
        getComputedStyle(cardEl.querySelector('.body')!).backgroundColor,
      );
      expect(getComputedStyle(cardEl).boxShadow).not.toBe('none');
      expect(cardEl.classList).not.toContain('pinned');

      pinButton()!.click();
      await settle();
      expect(card()!.classList).toContain('pinned');
    });

    it('is not undone by a click elsewhere, only by the pin button or Esc', async () => {
      await open();
      pinButton()!.click();
      await settle();

      document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await settle();
      expect(card()).not.toBeNull();

      pinButton()!.click(); // unpin
      leave(card());
      leave(anchorOf(0));
      await wait(HOVER_CLOSE_DELAY_MS);
      expect(card()).toBeNull();
    });

    it('can be released with Esc', async () => {
      await open();
      pinButton()!.click();
      await settle();

      document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await settle();

      expect(card()).toBeNull();
    });

    it('holds only one card: pinning another unpins the first', async () => {
      await open(0);
      pinButton()!.click();
      await settle();
      leave(anchorOf(0));
      leave(card());

      await open(1);
      expect(cards().length).toBe(2);
      Array.from(document.querySelectorAll<HTMLButtonElement>('.card button.pin'))[1].click();
      await wait(HOVER_CLOSE_DELAY_MS);

      expect(cards().length).toBe(1);
      expect(card().textContent).toContain('Another text');
    });

    it('has no pin button when it is not pinnable', async () => {
      fixture.componentInstance.pinnable = false;
      await settle();
      fixture.destroy();
      fixture = TestBed.createComponent(Host);
      fixture.componentInstance.pinnable = false;
      await settle();

      await open();

      expect(card()).not.toBeNull();
      expect(pinButton()).toBeNull();
    });
  });

  it('never opens while it is switched off', async () => {
    fixture.destroy();
    fixture = TestBed.createComponent(Host);
    fixture.componentInstance.enabled = false;
    await settle();

    hover(anchorOf(0));
    await wait(HOVER_OPEN_DELAY_MS);

    expect(card()).toBeNull();
  });

  describe('with your own trigger and content', () => {
    it('shows what was put between the tags as the trigger', () => {
      expect(el().querySelector('.own-trigger')!.textContent).toBe('Own trigger');
    });

    it('shows the projected body in the card, under the heading', async () => {
      hover(anchorOf(2));
      await wait(HOVER_OPEN_DELAY_MS);

      expect(card().querySelector('h3')!.textContent).toBe('Members');
      expect(card().querySelector('.own-body li')!.textContent).toBe('Anna');
    });

    it('can be opened by the trigger itself through toggle()', async () => {
      fixture.componentInstance.custom().toggle();
      await settle();

      expect(card()).not.toBeNull();
    });
  });
});
