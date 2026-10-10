import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { TEST_USERS } from '../../../testing/test-users';
import type { Entry, Logbook, MemberRole, User } from '../../../core/models/logbook.models';
import { DeleteEntryDialog } from './delete-entry-dialog';
import { OWNER_ACCESS } from '../../../testing/logbook-fixtures';

const [anna] = TEST_USERS;

const logbook = (members: { user: User; role: MemberRole }[]): Logbook => ({
  id: 'l1',
  title: 'My logbook',
  description: '',
  instrument: null,
  proposalId: null,
  visibility: 'private',
  members,
  owner: TEST_USERS[0],
  ...OWNER_ACCESS,
  createdAt: '2026-10-01T10:00:00Z',
  updatedAt: '2026-10-01T10:00:00Z',
});

const entry = (id: string): Entry => ({
  id,
  logbookId: 'l1',
  title: `Entry ${id}`,
  content: { type: 'doc', content: [] },
  revision: 1,
  createdAt: '2026-10-01T10:00:00Z',
  updatedAt: '2026-10-01T10:00:00Z',
  updatedBy: anna,
});

describe('DeleteEntryDialog', () => {
  const create = (book: Logbook, title = 'Day 1') => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: MAT_DIALOG_DATA, useValue: { entry: { ...entry('a'), title }, logbook: book } },
      ],
    });
    const fixture = TestBed.createComponent(DeleteEntryDialog);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  const labels = (el: HTMLElement) =>
    Array.from(el.querySelectorAll('button')).map((b) => b.textContent?.trim());

  it('asks "are you sure" with Yes and No, naming the entry', () => {
    const el = create(logbook([{ user: anna, role: 'owner' }]));

    expect(el.textContent).toContain('Are you sure you want to delete this entry');
    expect(el.textContent).toContain('Day 1');
    expect(labels(el)).toEqual(['No', 'Yes']);
  });

  it('never shows a scrollbar for its short message', () => {
    const el = create(logbook([{ user: anna, role: 'owner' }]));

    expect(getComputedStyle(el.querySelector('mat-dialog-content')!).overflowY).toBe('visible');
  });

  it('calls an untitled entry "Untitled entry"', () => {
    expect(create(logbook([{ user: anna, role: 'owner' }]), '').textContent).toContain(
      'Untitled entry',
    );
  });
});
