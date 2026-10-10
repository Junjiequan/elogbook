import { DATE_PIPE_DEFAULT_OPTIONS } from '@angular/common';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DEMO_USERS } from '../../../../demo/demo-users';
import { DATE_TIME_FORMAT } from '../../../core/date-format';
import type { Logbook, MemberRole } from '../../../core/models/logbook.models';
import { LogbookCard } from './logbook-card';

const [anna, jon] = DEMO_USERS;

const book = (overrides: Partial<Logbook> = {}): Logbook => ({
  id: 'l1',
  title: 'LoKI beamtime 2026-0412',
  description: 'Shear series on SDS micelles.',
  instrument: 'LoKI',
  proposalId: '2026-0412',
  visibility: 'private',
  members: [
    { user: anna, role: 'owner' },
    { user: jon, role: 'viewer' },
  ],
  createdAt: '2026-10-01T10:00:00Z',
  updatedAt: '2026-10-09T08:46:00',
  ...overrides,
});

describe('LogbookCard', () => {
  let fixture: ComponentFixture<LogbookCard>;
  const el = () => fixture.nativeElement as HTMLElement;

  const create = async (
    logbook: Logbook,
    options: { role?: MemberRole | null; terms?: string[] } = {},
  ) => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: DATE_PIPE_DEFAULT_OPTIONS, useValue: { dateFormat: DATE_TIME_FORMAT } },
      ],
    });
    fixture = TestBed.createComponent(LogbookCard);
    fixture.componentRef.setInput('logbook', logbook);
    fixture.componentRef.setInput('role', options.role ?? null);
    fixture.componentRef.setInput('terms', options.terms ?? []);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  it('shows the title, the description, the tags, the members and when it was updated', async () => {
    await create(book(), { role: 'owner' });

    expect(el().querySelector('h2')!.textContent).toBe('LoKI beamtime 2026-0412');
    expect(el().querySelector('.description')!.textContent).toBe('Shear series on SDS micelles.');
    expect(el().querySelector('app-logbook-tags')!.textContent).toContain('LoKI');
    expect(el().querySelector('app-logbook-tags .tag--role')!.textContent).toContain('owner');
    expect(el().querySelectorAll('app-member-avatars .avatar').length).toBe(2);
    expect(el().querySelector('.meta')!.textContent).toBe('Updated 2026-10-09 08:46');
  });

  it('opens the logbook only through its View banner: the card itself is not a link', async () => {
    await create(book());

    const links = el().querySelectorAll('a');
    expect(links.length).toBe(1);
    expect(links[0].classList).toContain('view-banner');
    expect(links[0].getAttribute('href')).toBe('/logbooks/l1');
    expect(links[0].getAttribute('aria-label')).toBe('View LoKI beamtime 2026-0412');
  });

  it('marks the search words in the title and the description', async () => {
    await create(book(), { terms: ['loki', 'micelles'] });

    expect(Array.from(el().querySelectorAll('mark')).map((m) => m.textContent)).toEqual([
      'LoKI',
      'micelles',
    ]);
    expect(el().querySelector('h2')!.textContent).toBe('LoKI beamtime 2026-0412'); // the text itself is unchanged
  });

  it('is the same height whatever the text, so a grid of cards stays even', async () => {
    await create(book());
    const short = el().querySelector('.card')!.getBoundingClientRect().height;

    await create(
      book({ title: 'A very long title '.repeat(12), description: 'Long text. '.repeat(80) }),
    );
    const long = el().querySelector('.card')!.getBoundingClientRect().height;

    expect(long).toBe(short);
  });

  it('shows no description line text when there is none, but keeps its place', async () => {
    await create(book({ description: '' }));

    expect(el().querySelector('.description')!.textContent).toBe('');
    expect(el().querySelector('.description')!.getBoundingClientRect().height).toBeGreaterThan(30);
  });
});
