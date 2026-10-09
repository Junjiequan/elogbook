import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DATE_PIPE_DEFAULT_OPTIONS } from '@angular/common';
import { Router, provideRouter } from '@angular/router';
import { DATE_TIME_FORMAT } from '../../../core/date-format';
import { DEMO_USERS } from '../../../../demo/demo-users';
import type { Logbook } from '../../../core/models/logbook.models';
import { provideFakeAuth } from '../../../testing/fake-auth';
import { HOVER_OPEN_DELAY_MS } from '../../../shared/table-popover/table-popover';
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
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideFakeAuth(anna),
        { provide: DATE_PIPE_DEFAULT_OPTIONS, useValue: { dateFormat: DATE_TIME_FORMAT } },
      ],
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

  it('writes the updated time year first, as 2026-10-01 12:00', async () => {
    await create([logbook('a')]);

    const updated = rows()[0].querySelector('td.nowrap')!.textContent!.trim();
    expect(updated).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
    expect(updated.startsWith('2026-10-01')).toBeTrue();
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

  it('opens a logbook only through the icon button in the first column', async () => {
    await create([logbook('a', { title: 'Beamtime' })]);

    const view = rows()[0].querySelector<HTMLAnchorElement>('td:first-child a.view-button')!;
    expect(view.getAttribute('href')).toBe('/logbooks/a');
    expect(view.getAttribute('aria-label')).toBe('View Beamtime');
    expect(view.textContent?.trim()).toBe('visibility'); // an icon, no text
    expect(el().querySelectorAll('a.view-button').length).toBe(1);
  });

  it('does nothing when the row or the title is clicked', async () => {
    await create([logbook('a')]);
    const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);

    rows()[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    rows()[0]
      .querySelector('.title-text')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(navigate).not.toHaveBeenCalled();
    expect(rows()[0].querySelector('.title-text')!.closest('a')).toBeNull(); // the title is not a link
  });

  it('shows initials for the members, and "…" when there are more than three', async () => {
    const another = (name: string) => ({
      user: { id: `${name}@example.org`, name, email: `${name}@example.org` },
      role: 'viewer' as const,
    });
    await create([
      logbook('a', {
        members: [
          { user: anna, role: 'owner' },
          { user: jon, role: 'editor' },
          { user: mei, role: 'viewer' },
          another('xavier'),
          another('yara'),
        ],
      }),
    ]);

    const avatars = Array.from(el().querySelectorAll('.avatar')).map((a) => a.textContent?.trim());
    expect(avatars).toEqual(['AL', 'JC', 'MT', '…']);
  });

  describe('one line per row', () => {
    const longTitle = 'A very long logbook title that cannot possibly fit in its column '.repeat(4);
    const longDescription = 'A long description of the experiment. '.repeat(30);

    const createNarrow = async (book: Logbook) => {
      await create([book]);
      // The description column only shows on wide screens; the test browser window is narrower.
      const style = document.createElement('style');
      style.textContent = '.wide-only { display: table-cell !important; }';
      (fixture.nativeElement as HTMLElement).append(style);
      (fixture.nativeElement as HTMLElement).style.display = 'block';
      (fixture.nativeElement as HTMLElement).style.width = '700px';
      await new Promise((resolve) => setTimeout(resolve, 60)); // the truncation check runs on resize
      fixture.detectChanges();
      await fixture.whenStable();
    };

    const card = () => document.querySelector<HTMLElement>('.cdk-overlay-container .card');
    const hoverOver = async (selector: string) => {
      el().querySelector(selector)!.closest('.anchor')!.dispatchEvent(new MouseEvent('mouseenter'));
      await new Promise((resolve) => setTimeout(resolve, HOVER_OPEN_DELAY_MS + 60));
      fixture.detectChanges();
      await fixture.whenStable();
    };

    it('cuts a long title with an ellipsis and shows all of it in the card on hover', async () => {
      await createNarrow(logbook('a', { title: longTitle }));

      const link = el().querySelector<HTMLElement>('.title-text')!;
      expect(getComputedStyle(link).whiteSpace).toBe('nowrap');
      // the cut is marked by our own accent-coloured "…", which is only there when text is cut off
      const dots = link.closest('.anchor')!.querySelector('.cut-dots')!;
      expect(dots.textContent).toBe('…');
      expect(getComputedStyle(dots).color).not.toBe(getComputedStyle(link).color);
      expect(link.hasAttribute('title')).toBeFalse(); // no browser tooltip; the card does it

      await hoverOver('.title-text');
      expect(card()!.textContent).toContain(longTitle.trim());
    });

    it('shows no "…" and no card when the text fits', async () => {
      await createNarrow(logbook('a', { title: 'Short', description: 'Short too' }));

      expect(el().querySelector('.cut-dots')).toBeNull();
      await hoverOver('.title-text');
      await hoverOver('.description-text');
      expect(card()).toBeNull();
    });

    it('shows no card for a title that fits', async () => {
      await createNarrow(logbook('a', { title: 'Short' }));

      await hoverOver('.title-text');
      expect(card()).toBeNull();
    });

    it('keeps every row a single line', async () => {
      await createNarrow(logbook('a', { title: longTitle, description: longDescription }));

      const row = rows()[0] as HTMLElement;
      const lineHeight = parseFloat(getComputedStyle(row.querySelector('.title-text')!).lineHeight);
      expect(row.getBoundingClientRect().height).toBeLessThan(lineHeight * 2 + 14);
    });

    it('shows the full description in the card when the mouse is over the cut-off text', async () => {
      await createNarrow(logbook('a', { description: longDescription }));

      expect(el().querySelector('app-table-popover button.trigger')).toBeNull(); // no icon any more
      await hoverOver('.description-text');
      expect(card()!.textContent).toContain(longDescription.trim());
    });

    it('shows three members as initials, and "…" listing everyone when there are more', async () => {
      const people = ['Anna Lindqvist', 'Jon Carter', 'Mei Tanaka', 'Xavier Young', 'Yara Zed'].map(
        (name) => ({
          user: { id: `${name}@example.org`, name, email: `${name}@example.org` },
          role: 'viewer' as const,
        }),
      );
      await createNarrow(logbook('a', { members: people }));

      const avatars = Array.from(el().querySelectorAll('.avatar')).map((a) =>
        a.textContent?.trim(),
      );
      expect(avatars).toEqual(['AL', 'JC', 'MT', '…']);

      const more = el().querySelector<HTMLButtonElement>('.avatar.more')!;
      expect(more.classList).not.toContain('active');

      more.click(); // a click keeps the list open, so there is no pin button
      await new Promise((resolve) => setTimeout(resolve, 50));
      fixture.detectChanges();
      await fixture.whenStable();

      expect(card()!.querySelectorAll('.member-list li').length).toBe(5);
      expect(card()!.textContent).toContain('Yara Zed');
      expect(card()!.querySelector('button.pin')).toBeNull();
      expect(card()!.querySelector('footer')).toBeNull();
      expect(more.classList).toContain('active'); // keeps its colour while the list is open
    });

    it('shows no card for a description that fits', async () => {
      await createNarrow(logbook('a', { description: 'Short' }));

      await hoverOver('.description-text');
      expect(card()).toBeNull();
    });
  });
});
