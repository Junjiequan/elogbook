import type { Mock } from 'vitest';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';
import { SampleLogbooksButton } from './sample-logbooks';
import { SampleLogbooks } from './sample-logbooks.service';

describe('SampleLogbooksButton', () => {
  let fixture: ComponentFixture<SampleLogbooksButton>;
  let samples: {
    available: ReturnType<typeof signal<boolean>>;
    count: ReturnType<typeof signal<number>>;
    busy: ReturnType<typeof signal<boolean>>;
    add: Mock;
    remove: Mock;
  };
  let dialog: {
    open: Mock;
  };
  let snackBar: {
    open: Mock;
  };
  const el = () => fixture.nativeElement as HTMLElement;
  const button = () => el().querySelector<HTMLButtonElement>('button.toggle');

  const create = async (
    options: {
      available?: boolean;
      count?: number;
      confirm?: boolean;
    } = {},
  ) => {
    samples = {
      available: signal(options.available ?? true),
      count: signal(options.count ?? 0),
      busy: signal(false),
      add: vi.fn().mockName('add').mockResolvedValue(undefined),
      remove: vi.fn().mockName('remove').mockResolvedValue(undefined),
    };
    dialog = {
      open: vi
        .fn()
        .mockName('open')
        .mockReturnValue({ afterClosed: () => of(options.confirm ? true : undefined) }),
    };
    snackBar = { open: vi.fn().mockName('open') };
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: SampleLogbooks, useValue: samples },
        { provide: MatDialog, useValue: dialog },
        { provide: MatSnackBar, useValue: snackBar },
      ],
    });
    fixture = TestBed.createComponent(SampleLogbooksButton);
    await settle();
  };

  const settle = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  it('shows nothing when the server has sample logbooks switched off', async () => {
    await create({ available: false });

    expect(button()).toBeNull();
  });

  it('offers to add them when there are none, and does so at once', async () => {
    await create({ count: 0 });
    expect(button()!.textContent).toContain('Add sample logbooks');

    button()!.click();
    await settle();

    expect(samples.add).toHaveBeenCalledTimes(1);
    expect(dialog.open).not.toHaveBeenCalled();
    expect(snackBar.open).toHaveBeenCalledWith('Sample logbooks added.', undefined, {
      duration: 3000,
    });
  });

  it('offers to remove them once there are some, and asks first', async () => {
    await create({ count: 15, confirm: true });
    expect(button()!.textContent).toContain('Remove sample logbooks');

    button()!.click();
    await settle();

    expect(dialog.open).toHaveBeenCalledTimes(1);
    expect(samples.remove).toHaveBeenCalledTimes(1);
  });

  it('removes nothing when the answer is no', async () => {
    await create({ count: 15, confirm: false });

    button()!.click();
    await settle();

    expect(samples.remove).not.toHaveBeenCalled();
  });

  it('says so when it did not work', async () => {
    await create({ count: 0 });
    samples.add.mockRejectedValue(new Error('offline'));

    button()!.click();
    await settle();

    expect(snackBar.open).toHaveBeenCalledWith('That did not work. Try again.', 'Dismiss', {
      duration: 6000,
    });
  });

  it('cannot be pressed twice while it is working', async () => {
    await create({ count: 0 });

    samples.busy.set(true);
    await settle();

    expect(button()!.disabled).toBe(true);
  });
});
