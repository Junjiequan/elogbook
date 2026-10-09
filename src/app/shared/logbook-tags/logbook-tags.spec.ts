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
});
