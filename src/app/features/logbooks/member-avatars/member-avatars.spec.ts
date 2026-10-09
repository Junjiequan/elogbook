import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { LogbookMember } from '../../../core/models/logbook.models';
import {
  HOVER_CLOSE_DELAY_MS,
  HOVER_OPEN_DELAY_MS,
} from '../../../shared/table-popover/table-popover';
import { MemberAvatars } from './member-avatars';

const people = (names: string[]): LogbookMember[] =>
  names.map((name, i) => ({
    user: {
      id: `${name}@example.org`,
      name,
      email: `${name.toLowerCase().replace(' ', '.')}@example.org`,
    },
    role: i === 0 ? 'owner' : 'viewer',
  }));

describe('MemberAvatars', () => {
  let fixture: ComponentFixture<MemberAvatars>;
  const el = () => fixture.nativeElement as HTMLElement;
  const card = () => document.querySelector<HTMLElement>('.cdk-overlay-container .card');
  const initials = () =>
    Array.from(el().querySelectorAll('.avatar')).map((a) => a.textContent?.trim());
  const wait = async (ms: number) => {
    await new Promise((resolve) => setTimeout(resolve, ms));
    fixture.detectChanges();
    await fixture.whenStable();
  };

  const create = async (names: string[]) => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    fixture = TestBed.createComponent(MemberAvatars);
    fixture.componentRef.setInput('members', people(names));
    fixture.detectChanges();
    await fixture.whenStable();
  };

  afterEach(() => fixture?.destroy());

  it('shows each person as initials when there are three or fewer', async () => {
    await create(['Anna Lindqvist', 'Jon Carter', 'Mei Tanaka']);

    expect(initials()).toEqual(['AL', 'JC', 'MT']);
    expect(el().querySelector('.avatar.more')).toBeNull();
  });

  it('ends in "…" when there are more than three, and that lists everyone', async () => {
    await create(['Anna Lindqvist', 'Jon Carter', 'Mei Tanaka', 'Xavier Young', 'Yara Zed']);

    expect(initials()).toEqual(['AL', 'JC', 'MT', '…']);
    const more = el().querySelector<HTMLButtonElement>('.avatar.more')!;
    expect(more.getAttribute('aria-label')).toBe('Show all 5 members');

    more.click();
    await wait(50);

    expect(card()!.querySelectorAll('.member-list li').length).toBe(5);
    expect(more.classList).toContain('active');
    expect(card()!.querySelector('button.pin')).toBeNull();
  });

  it('shows a person’s name, email and role on hover, without pinning', async () => {
    await create(['Anna Lindqvist', 'Jon Carter']);
    const second = el().querySelectorAll<HTMLButtonElement>('.avatar')[1];

    second.closest('.anchor')!.dispatchEvent(new MouseEvent('mouseenter'));
    await wait(HOVER_OPEN_DELAY_MS + 50);

    expect(card()!.querySelector('h3')!.textContent).toBe('Jon Carter');
    expect(card()!.textContent).toContain('jon.carter@example.org');
    expect(card()!.querySelector('.role')!.textContent).toBe('viewer');
    expect(card()!.querySelector('button.pin')).toBeNull();

    // A click does not keep it open: it goes away with the mouse.
    second.click();
    second.closest('.anchor')!.dispatchEvent(new MouseEvent('mouseleave'));
    await wait(HOVER_CLOSE_DELAY_MS + 100);
    expect(card()).toBeNull();
  });
});
