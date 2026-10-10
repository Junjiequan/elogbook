import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { TEST_USERS } from '../../../testing/test-users';
import { LogbookRepository } from '../../../core/data-access/logbook.repository';
import type { Logbook } from '../../../core/models/logbook.models';
import { DeleteLogbookDialog } from './delete-logbook-dialog';
import { OWNER_ACCESS } from '../../../testing/logbook-fixtures';

const [anna] = TEST_USERS;

const logbook = (id: string, owner = anna): Logbook => ({
  id,
  title: `Logbook ${id}`,
  description: '',
  instrument: null,
  proposalId: null,
  visibility: 'private',
  members: [{ user: owner, role: 'owner' }],
  owner: owner,
  ...OWNER_ACCESS,
  createdAt: '2026-10-01T10:00:00Z',
  updatedAt: '2026-10-01T10:00:00Z',
});

describe('DeleteLogbookDialog', () => {
  const create = async (book: Logbook) => {
    const repo = {
      listEntries: vi.fn().mockName('LogbookRepository.listEntries'),
    };
    repo.listEntries.mockResolvedValue([{}, {}, {}] as never);
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: LogbookRepository, useValue: repo },
        { provide: MAT_DIALOG_DATA, useValue: { logbook: book } },
      ],
    });
    const fixture = TestBed.createComponent(DeleteLogbookDialog);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  const labels = (el: HTMLElement) =>
    Array.from(el.querySelectorAll('button')).map((b) => b.textContent?.trim());

  it('asks "are you sure" with Yes and No, naming the logbook and what is lost', async () => {
    const el = await create(logbook('x'));

    expect(el.textContent).toContain('Are you sure you want to delete');
    expect(el.textContent).toContain('Logbook x');
    expect(el.textContent).toContain('3 entries');
    expect(labels(el)).toEqual(['No', 'Yes']);
  });

  it('never shows a scrollbar for its short message', async () => {
    const el = await create(logbook('x'));

    const content = el.querySelector('mat-dialog-content')!;
    expect(getComputedStyle(content).overflowY).toBe('visible');
  });
});
