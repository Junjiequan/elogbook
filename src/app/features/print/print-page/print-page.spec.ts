import { provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LogbookRepository } from '../../../core/data-access/logbook.repository';
import { ProposalRepository } from '../../../core/data-access/proposal.repository';
import type { Entry, Logbook } from '../../../core/models/logbook.models';
import { DemoProposalRepository } from '../../../demo/demo-proposals';
import { DEMO_USERS } from '../../../demo/demo-users';
import { LogbooksStore } from '../../logbooks/logbooks.store';
import { PrintPage } from './print-page';

const [anna] = DEMO_USERS;

const logbook: Logbook = {
  id: 'l1',
  title: 'Beamtime 1',
  description: 'Shear series',
  instrument: 'LoKI',
  proposalId: '2026-0412',
  visibility: 'private',
  members: [{ user: anna, role: 'owner' }],
  createdAt: '2026-10-01T10:00:00Z',
  updatedAt: '2026-10-01T10:00:00Z',
};

const entry = (id: string, title: string, createdAt: string): Entry => ({
  id,
  logbookId: 'l1',
  title,
  content: {
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text: `Text of ${title}` }] }],
  },
  revision: 1,
  createdAt,
  updatedAt: createdAt,
  updatedBy: anna,
});

describe('PrintPage', () => {
  let fixture: ComponentFixture<PrintPage>;
  const el = () => fixture.nativeElement as HTMLElement;
  const headings = () =>
    Array.from(el().querySelectorAll('.entry h2')).map((h) => h.textContent?.trim());

  const create = async (inputs: { entry?: string } = {}, logbooks: Logbook[] = [logbook]) => {
    const repo = jasmine.createSpyObj<LogbookRepository>('LogbookRepository', ['listEntries']);
    repo.listEntries.and.resolveTo([
      entry('b', 'Second day', '2026-10-02T09:00:00Z'),
      entry('a', 'First day', '2026-10-01T09:00:00Z'),
      entry('c', '', '2026-10-03T09:00:00Z'),
    ]);
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: LogbookRepository, useValue: repo },
        { provide: LogbooksStore, useValue: { logbooks: signal(logbooks) } },
        { provide: ProposalRepository, useClass: DemoProposalRepository },
      ],
    });
    fixture = TestBed.createComponent(PrintPage);
    fixture.componentRef.setInput('logbookId', 'l1');
    if (inputs.entry) {
      fixture.componentRef.setInput('entry', inputs.entry);
    }
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    await fixture.whenStable();
    return repo;
  };

  it('shows the logbook as a cover with its title, description, instrument and proposal', async () => {
    await create();

    const cover = el().querySelector('.cover')!.textContent!;
    expect(cover).toContain('Beamtime 1');
    expect(cover).toContain('Shear series');
    expect(cover).toContain('Instrument: LoKI');
    expect(cover).toContain('Proposal: 2026-0412');
  });

  it('prints every entry, oldest first, naming the untitled ones', async () => {
    await create();

    expect(headings()).toEqual(['First day', 'Second day', 'Untitled entry']);
    expect(el().textContent).toContain('Text of First day');
  });

  it('can be limited to a single entry', async () => {
    await create({ entry: 'b' });

    expect(headings()).toEqual(['Second day']);
  });

  it('leaves the toolbar out of the printed page and prints on request', async () => {
    await create();
    const print = spyOn(window, 'print');

    expect(el().querySelector('.toolbar')!.classList).toContain('no-print');
    el().querySelector<HTMLButtonElement>('.toolbar button')!.click();

    expect(print).toHaveBeenCalledTimes(1);
  });

  it('shows nothing of the document while the logbook is unknown', async () => {
    await create({}, []);

    expect(el().querySelector('.document')).toBeNull();
  });
});
