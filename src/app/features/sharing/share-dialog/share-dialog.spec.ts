import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatButtonHarness } from '@angular/material/button/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatInputHarness } from '@angular/material/input/testing';
import { MatRadioGroupHarness } from '@angular/material/radio/testing';
import type { Logbook } from '../../../core/models/logbook.models';
import { DEMO_USERS } from '../../../../demo/demo-users';
import { LogbooksStore } from '../../logbooks/logbooks.store';
import { ShareDialog } from './share-dialog';

const [anna, jon] = DEMO_USERS;

const logbook: Logbook = {
  id: 'l1',
  title: 'Beamtime 1',
  description: '',
  instrument: null,
  proposalId: null,
  visibility: 'private',
  members: [
    { user: anna, role: 'owner' },
    { user: jon, role: 'viewer' },
  ],
  createdAt: '2026-10-01T10:00:00Z',
  updatedAt: '2026-10-01T10:00:00Z',
};

describe('ShareDialog', () => {
  let fixture: ComponentFixture<ShareDialog>;
  let loader: HarnessLoader;
  let store: jasmine.SpyObj<LogbooksStore>;
  let ref: jasmine.SpyObj<MatDialogRef<ShareDialog>>;
  const el = () => fixture.nativeElement as HTMLElement;
  const people = () =>
    Array.from(el().querySelectorAll('.members .name')).map((n) => n.textContent?.trim());

  const create = async (canManage: boolean) => {
    store = jasmine.createSpyObj('LogbooksStore', ['updateSettings']);
    store.updateSettings.and.resolveTo();
    ref = jasmine.createSpyObj('MatDialogRef', ['close']);
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: MAT_DIALOG_DATA, useValue: { logbook, canManage } },
        { provide: MatDialogRef, useValue: ref },
        { provide: LogbooksStore, useValue: store },
      ],
    });
    fixture = TestBed.createComponent(ShareDialog);
    fixture.detectChanges();
    await fixture.whenStable();
    loader = TestbedHarnessEnvironment.loader(fixture);
  };

  const button = (text: string) => loader.getHarness(MatButtonHarness.with({ text }));

  it('lists the people with access, and the owner cannot be removed', async () => {
    await create(true);

    expect(people()).toEqual([anna.name, jon.name]);
    expect(el().querySelector('button[aria-label="Remove ' + anna.name + '"]')).toBeNull();
    expect(el().querySelector('button[aria-label="Remove ' + jon.name + '"]')).not.toBeNull();
  });

  it('adds a person by email, turning the address into a name and a lower-case id', async () => {
    await create(true);

    await (await loader.getHarness(MatInputHarness)).setValue('Mei.Tanaka@Example.org');
    await (await button('Add')).click();

    expect(people()).toContain('Mei Tanaka');
    expect(await (await loader.getHarness(MatInputHarness)).getValue()).toBe('');

    await (await button('Save')).click();
    const saved = store.updateSettings.calls.mostRecent().args[1];
    expect(saved.members!.at(-1)).toEqual({
      user: { id: 'mei.tanaka@example.org', name: 'Mei Tanaka', email: 'mei.tanaka@example.org' },
      role: 'editor',
    });
  });

  it('will not add the same person twice, and rejects things that are not email addresses', async () => {
    await create(true);
    const email = await loader.getHarness(MatInputHarness);

    await email.setValue('not an address');
    expect(await (await button('Add')).isDisabled()).toBeTrue();

    await email.setValue(jon.email);
    await (await button('Add')).click();
    expect(el().textContent).toContain('Already has access');
    expect(people().length).toBe(2);
  });

  it('removes a person', async () => {
    await create(true);

    el().querySelector<HTMLButtonElement>(`button[aria-label="Remove ${jon.name}"]`)!.click();
    fixture.detectChanges();

    expect(people()).toEqual([anna.name]);
  });

  it('saves only after something has changed, then closes', async () => {
    await create(true);
    expect(await (await button('Save')).isDisabled()).toBeTrue();

    const access = await loader.getHarness(MatRadioGroupHarness);
    await access.checkRadioButton({ label: /Facility/ });
    await (await button('Save')).click();

    expect(store.updateSettings).toHaveBeenCalledOnceWith('l1', {
      members: logbook.members,
      visibility: 'facility-read',
    });
    expect(ref.close).toHaveBeenCalled();
  });

  it('is read-only for someone who is not the owner', async () => {
    await create(false);

    expect(el().textContent).toContain('Only the owner can change who has access.');
    expect(el().querySelector('form')).toBeNull();
    expect(el().querySelector('button[aria-label^="Remove"]')).toBeNull();
    expect(await (await loader.getHarness(MatRadioGroupHarness)).getRadioButtons()).toBeDefined();
    expect(el().querySelector('.mat-mdc-dialog-actions button')?.textContent).toContain('Close');
    expect(el().textContent).not.toContain('Save');
  });
});
