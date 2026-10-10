import { provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LogbookRepository } from '../../../core/data-access/logbook.repository';
import { TEST_USERS } from '../../../testing/test-users';
import type { EntryVersion } from '../../../core/models/logbook.models';
import { EntryAutosave } from '../../entry/entry-autosave';
import { HistoryPanel } from './history-panel';

const version = (id: string, reason: EntryVersion['reason']): EntryVersion => ({
  id,
  entryId: 'e1',
  title: 'Day 1',
  content: { type: 'doc', content: [] },
  savedAt: '2026-10-09T08:46:00Z',
  savedBy: TEST_USERS[0],
  reason,
});

describe('HistoryPanel', () => {
  let fixture: ComponentFixture<HistoryPanel>;
  const el = () => fixture.nativeElement as HTMLElement;
  const items = () => Array.from(el().querySelectorAll<HTMLButtonElement>('li button'));

  const create = async (versions: EntryVersion[]) => {
    const repo = {
      listVersions: vi.fn().mockName('LogbookRepository.listVersions'),
    };
    repo.listVersions.mockResolvedValue(versions);
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: LogbookRepository, useValue: repo },
        {
          provide: EntryAutosave,
          useValue: { entry: signal({ id: 'e1' }), savedCount: signal(0) },
        },
      ],
    });
    fixture = TestBed.createComponent(HistoryPanel);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return repo;
  };

  it('lists the saved versions of the entry with who saved them and why', async () => {
    const repo = await create([version('v2', 'manual'), version('v1', 'auto')]);

    expect(repo.listVersions).toHaveBeenCalledWith('e1');
    expect(items().length).toBe(2);
    expect(items()[0].textContent).toContain(`${TEST_USERS[0].name} · Saved by user`);
    expect(items()[1].textContent).toContain('Automatic');
  });

  it('says so when there are no versions yet', async () => {
    await create([]);

    expect(el().querySelector('li.empty')!.textContent).toContain('No saved versions yet');
  });

  it('marks the version being previewed and reports which one is chosen', async () => {
    await create([version('v2', 'manual'), version('v1', 'auto')]);
    fixture.componentRef.setInput('selectedId', 'v1');
    fixture.detectChanges();
    const chosen: EntryVersion[] = [];
    fixture.componentInstance.selected.subscribe((v) => chosen.push(v));

    expect(items()[1].classList).toContain('selected');
    expect(items()[0].classList).not.toContain('selected');
    items()[0].click();
    expect(chosen.map((v) => v.id)).toEqual(['v2']);
  });

  it('can be closed', async () => {
    await create([]);
    let closed = 0;
    fixture.componentInstance.closed.subscribe(() => closed++);

    el().querySelector<HTMLButtonElement>('button[aria-label="Close version history"]')!.click();

    expect(closed).toBe(1);
  });
});
