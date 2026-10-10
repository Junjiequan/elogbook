import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { MemberRole, Visibility } from '../../core/models/logbook.models';
import { LogbookTags } from './logbook-tags';

describe('LogbookTags', () => {
  const render = (inputs: {
    instrument?: string | null;
    proposalId?: string | null;
    role?: MemberRole | null;
    demo?: boolean;
    visibility?: Visibility | null;
  }) => {
    TestBed.resetTestingModule(); // each call renders a fresh component
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const fixture = TestBed.createComponent(LogbookTags);
    for (const [name, value] of Object.entries(inputs)) {
      fixture.componentRef.setInput(name, value);
    }
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  const tags = (el: HTMLElement) =>
    Array.from(el.querySelectorAll('.tag')).map((t) => t.textContent?.replace(/\s+/g, ' ').trim());

  it('shows instrument, proposal and role', () => {
    const el = render({ instrument: 'LoKI', proposalId: '2026-0412', role: 'owner' });

    expect(tags(el)).toEqual(['sensorsLoKI', 'description2026-0412', 'workspace_premiumowner']);
  });

  it('leaves out what a logbook does not have', () => {
    expect(tags(render({ role: 'viewer' }))).toEqual(['visibilityviewer']);
  });

  it('can also show "Demo" and who can read the logbook, for the list', () => {
    expect(
      tags(render({ instrument: 'LoKI', demo: true, role: 'owner', visibility: 'private' })),
    ).toEqual(['sensorsLoKI', 'Demo', 'workspace_premiumowner', 'lock Private']);

    expect(tags(render({ visibility: 'facility-read' }))).toEqual(['public Facility-wide read']);
  });

  it('marks the role so it can be coloured, and gives each role its own icon', () => {
    expect(render({ role: 'editor' }).querySelector('.tag--role')!.getAttribute('data-role')).toBe(
      'editor',
    );
    expect(render({ role: 'editor' }).querySelector('.tag--role mat-icon')!.textContent).toBe(
      'edit',
    );
  });

  describe('the role tag', () => {
    const card = () => document.querySelector<HTMLElement>('.cdk-overlay-container .card');
    const roleTag = (el: HTMLElement) => el.querySelector<HTMLElement>('.tag--role')!;
    const openFor = async (el: HTMLElement) => {
      roleTag(el)
        .closest('.anchor')!
        .dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 200));
    };

    it('can be reached with the keyboard, and says what it is for', () => {
      const tag = roleTag(render({ role: 'viewer' }));

      expect(tag.getAttribute('tabindex')).toBe('0');
      expect(tag.getAttribute('aria-label')).toContain('Your role: viewer');
    });

    it('opens a card that says what a viewer can and cannot do', async () => {
      await openFor(render({ role: 'viewer' }));

      expect(card()!.getAttribute('aria-label')).toBe('Your role: viewer');
      expect(card()!.textContent).toContain('Open the logbook and read its entries');
      expect(card()!.textContent).toContain('Add or edit entries');
    });

    it('says an owner is not limited', async () => {
      await openFor(render({ role: 'owner' }));

      expect(card()!.textContent).toContain('Delete entries and the logbook');
      expect(card()!.textContent).toContain('Nothing is off limits here.');
    });

    it('has no card when there is no role', () => {
      expect(render({ role: null }).querySelector('app-table-popover')).toBeNull();
    });
  });
});
