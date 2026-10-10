import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ROLE_CAPABILITIES } from '../../core/models/role-capabilities';
import type { MemberRole } from '../../core/models/logbook.models';
import { RoleDetails } from './role-details';

describe('RoleDetails', () => {
  let fixture: ComponentFixture<RoleDetails>;
  const el = () => fixture.nativeElement as HTMLElement;
  const items = (list: 'can' | 'cannot') =>
    Array.from(el().querySelectorAll(`.${list} li span`)).map((item) => item.textContent?.trim());

  const create = async (role: MemberRole) => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    fixture = TestBed.createComponent(RoleDetails);
    fixture.componentRef.setInput('role', role);
    fixture.detectChanges();
    await fixture.whenStable();
  };

  it('lists what a viewer can and cannot do', async () => {
    await create('viewer');

    expect(el().querySelector('.summary')!.textContent).toBe(ROLE_CAPABILITIES.viewer.summary);
    expect(items('can').join('|')).toContain('read its entries');
    expect(items('cannot')).toContain('Add or edit entries');
    expect(items('cannot')).toContain('Delete entries or the logbook');
  });

  it('lets an editor change entries and versions, but not delete or manage', async () => {
    await create('editor');

    expect(items('can')).toContain('Add and edit entries');
    expect(items('can')).toContain('Save and restore versions');
    expect(items('cannot')).toEqual([
      'Delete entries or the logbook',
      'Change the title, or who has access',
    ]);
  });

  it('says an owner has no limits, instead of showing an empty list', async () => {
    await create('owner');

    expect(items('can')).toContain('Delete entries and the logbook');
    expect(items('can')).toContain('Change who has access, and hand the logbook over');
    expect(items('cannot')).toEqual(['Nothing is off limits here.']);
  });

  it('never lists the same thing under both can and cannot', () => {
    for (const role of ['viewer', 'editor', 'owner'] as const) {
      const { can, cannot } = ROLE_CAPABILITIES[role];
      expect(can.filter((item) => cannot.includes(item))).toEqual([]);
    }
  });
});
