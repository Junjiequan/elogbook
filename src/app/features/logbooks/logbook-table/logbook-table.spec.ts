import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { DEMO_USERS } from '../../../../demo/demo-users';
import type { Logbook } from '../../../core/models/logbook.models';
import { provideFakeAuth } from '../../../testing/fake-auth';
import { LogbookTable } from './logbook-table';

const [anna, jon, mei] = DEMO_USERS;

const logbook = (id: string, extra: Partial<Logbook> = {}): Logbook => ({
  id,
  title: `Logbook ${id}`,
  description: 'About it',
  instrument: 'LoKI',
  proposalId: '2026-0412',
  visibility: 'private',
  members: [{ user: anna, role: 'owner' }],
  createdAt: '2026-10-01T10:00:00Z',
  updatedAt: '2026-10-01T10:00:00Z',
  ...extra,
});

describe('LogbookTable', () => {
  let fixture: ComponentFixture<LogbookTable>;
  const el = () => fixture.nativeElement as HTMLElement;
  const rows = () => Array.from(el().querySelectorAll('tbody tr'));

  const create = async (logbooks: Logbook[]) => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideRouter([]), provideFakeAuth(anna)],
    });
    fixture = TestBed.createComponent(LogbookTable);
    fixture.componentRef.setInput('logbooks', logbooks);
    fixture.detectChanges();
    await fixture.whenStable();
  };

  it('shows one row per logbook with its details', async () => {
    await create([logbook('a'), logbook('b', { instrument: null, proposalId: null })]);

    expect(rows().length).toBe(2);
    const first = rows()[0].textContent!;
    expect(first).toContain('Logbook a');
    expect(first).toContain('LoKI');
    expect(first).toContain('2026-0412');
    expect(first).toContain('Private');
    expect(rows()[1].textContent).toContain('–'); // no instrument or proposal
  });

  it('shows the current user’s role and marks demo logbooks', async () => {
    await create([
      logbook('a'),
      logbook('b', {
        demo: true,
        members: [
          { user: jon, role: 'owner' },
          { user: anna, role: 'viewer' },
        ],
      }),
    ]);

    expect(el().querySelectorAll('.role')[0].textContent?.trim()).toBe('owner');
    expect(el().querySelectorAll('.role')[1].textContent?.trim()).toBe('viewer');
    expect(rows()[1].querySelector('.badge')?.textContent).toContain('Demo');
    expect(rows()[0].querySelector('.badge')).toBeNull();
  });

  it('links the title to the logbook', async () => {
    await create([logbook('a')]);

    expect(rows()[0].querySelector('a')!.getAttribute('href')).toBe('/logbooks/a');
  });

  it('opens the logbook when the row is clicked', async () => {
    await create([logbook('a')]);
    const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);

    rows()[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(navigate).toHaveBeenCalledWith(['/logbooks', 'a']);
  });

  it('shows initials for the members, and "+n" when there are more than three', async () => {
    const extra = { user: { id: 'x@example.org', name: 'Xavier Young', email: 'x@example.org' } };
    await create([
      logbook('a', {
        members: [
          { user: anna, role: 'owner' },
          { user: jon, role: 'editor' },
          { user: mei, role: 'viewer' },
          { ...extra, role: 'viewer' },
          { ...extra, role: 'viewer' },
        ],
      }),
    ]);

    const avatars = Array.from(el().querySelectorAll('.avatar')).map((a) => a.textContent?.trim());
    expect(avatars).toEqual(['AL', 'JC', 'MT', '+2']);
  });
});
