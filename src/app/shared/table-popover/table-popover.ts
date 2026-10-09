import {
  OverlayModule,
  type ConnectedOverlayPositionChange,
  type ConnectedPosition,
} from '@angular/cdk/overlay';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  signal,
} from '@angular/core';
import { A11yModule } from '@angular/cdk/a11y';
import { MatIcon } from '@angular/material/icon';
import { PopoverPin } from './popover-pin.service';

/**
 * The card opens only once the pointer has come to rest on the trigger for this long (every movement
 * starts the wait again), so moving the mouse down a table never throws cards over the rows below.
 */
export const HOVER_OPEN_DELAY_MS = 450;
/** How long it lingers after the pointer leaves: enough to cross the small gap onto the card. */
export const HOVER_CLOSE_DELAY_MS = 150;
/** Keyboard focus is deliberate, so it does not need the pause. */
export const FOCUS_OPEN_DELAY_MS = 100;

const START_POSITIONS: ConnectedPosition[] = [
  { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 8 },
  { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -8 },
  { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 8 },
  { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom', offsetY: -8 },
];

/** The same four places, but lined up with the trigger's right edge first (for a trigger in the corner). */
const END_POSITIONS: ConnectedPosition[] = [
  { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 8 },
  { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom', offsetY: -8 },
  { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 8 },
  { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -8 },
];

/**
 * The one card that tables use to show more than a cell has room for: a long title, a long
 * description, the full list of members.
 *
 * Hovering (or focusing) the trigger previews the card; the pin button on the card keeps it open,
 * and only one card can be pinned at a time. Esc closes it.
 *
 * How to use it:
 * - `heading` is the card's title; `text` is its body, or project your own markup into `[popoverBody]`.
 * - The trigger is an icon button when `triggerIcon` is set, otherwise whatever you put between the tags
 *   (the cell's own text or button). A custom trigger may call `toggle()` to open the card on click.
 * - `enabled` switches the card off, e.g. while a title is not cut off. `pinnable` hides the pin button.
 */
@Component({
  selector: 'app-table-popover',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [A11yModule, MatIcon, OverlayModule],
  templateUrl: './table-popover.html',
  styleUrl: './table-popover.scss',
  exportAs: 'appTablePopover',
})
export class TablePopover {
  readonly heading = input.required<string>();
  /** Plain text for the body; line breaks are kept. */
  readonly text = input<string | null>(null);
  /** Icon in front of the heading. */
  readonly icon = input('subject');
  /** Shows a ready-made icon button as the trigger; leave empty to use your own trigger. */
  readonly triggerIcon = input<string | null>(null);
  readonly triggerLabel = input('Show details');
  readonly pinnable = input(true);
  readonly enabled = input(true);
  /** Which edge of the trigger the card lines up with first; `end` suits a trigger in a right-hand corner. */
  readonly align = input<'start' | 'end'>('start');
  /** Width of the card as a CSS length, e.g. `260px`; leave empty for the default. */
  readonly width = input<string | null>(null);
  /** How long the pointer must rest on the trigger before the card opens. */
  readonly openDelay = input(HOVER_OPEN_DELAY_MS);
  /**
   * Set when the card holds things to press (a menu) rather than text to read: opening it by click or
   * key then moves the keyboard focus into it, keeps Tab inside, and gives the focus back on closing.
   */
  readonly interactive = input(false);

  private readonly pin = inject(PopoverPin);

  protected readonly positions = computed(() =>
    this.align() === 'end' ? END_POSITIONS : START_POSITIONS,
  );
  protected readonly takesFocus = computed(() => this.interactive() && this.clicked());
  /** Where the card ended up relative to its trigger, so the arrow can point the right way. */
  protected readonly placement = signal<{ above: boolean; alignEnd: boolean }>({
    above: false,
    alignEnd: false,
  });
  protected readonly pinned = computed(() => this.pin.pinned() === this);
  private readonly hovering = signal(false);
  protected readonly clicked = signal(false);
  /** Whether the card is showing; a custom trigger can use it to stay highlighted meanwhile. */
  readonly open = computed(
    () => this.enabled() && (this.pinned() || this.hovering() || this.clicked()),
  );

  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      clearTimeout(this.timer);
      this.pin.release(this);
    });
  }

  protected positioned(change: ConnectedOverlayPositionChange): void {
    const { overlayX, overlayY } = change.connectionPair;
    this.placement.set({ above: overlayY === 'bottom', alignEnd: overlayX === 'end' });
  }

  /** The pointer is waiting to open the card: set while the open timer runs. */
  private waiting = false;

  protected pointerEnter(): void {
    if (!this.open()) {
      this.waiting = true;
      this.schedule(true, this.openDelay());
    } else {
      this.keepOpen(); // came back onto the trigger while the card was lingering
    }
  }

  /** Any movement starts the wait again: the card is for a pointer that has stopped. */
  protected pointerMove(): void {
    if (this.waiting) {
      this.schedule(true, this.openDelay());
    }
  }

  protected pointerLeave(): void {
    this.waiting = false;
    this.schedule(false, HOVER_CLOSE_DELAY_MS);
  }

  protected focusIn(): void {
    this.schedule(true, FOCUS_OPEN_DELAY_MS);
  }

  /** The pointer is on the card itself, so it must not close while it is being read. */
  protected keepOpen(): void {
    clearTimeout(this.timer);
    this.waiting = false;
    this.hovering.set(true);
  }

  /** Opens the card (or closes it again): for touch screens and keyboards, where there is no hover. */
  toggle(): void {
    clearTimeout(this.timer);
    this.waiting = false;
    this.clicked.update((open) => !open);
    this.hovering.set(false);
  }

  protected togglePin(): void {
    this.pin.toggle(this);
  }

  protected close(): void {
    clearTimeout(this.timer);
    this.waiting = false;
    this.pin.release(this);
    this.hovering.set(false);
    this.clicked.set(false);
  }

  /** A click elsewhere closes a card that was opened by a click, but never a pinned one. */
  protected outsideClick(event: MouseEvent, anchor: HTMLElement): void {
    if (!this.pinned() && !anchor.contains(event.target as Node)) {
      this.close();
    }
  }

  private schedule(show: boolean, delay: number): void {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.waiting = false;
      this.hovering.set(show);
    }, delay);
  }
}
