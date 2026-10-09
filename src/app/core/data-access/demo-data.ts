import type { JSONContent } from '@tiptap/core';
import { DEMO_USERS } from '../auth/current-user.service';
import type { Entry, Logbook } from '../models/logbook.models';

const [anna, jon, mei] = DEMO_USERS;

const heading = (text: string, level = 2): JSONContent => ({
  type: 'heading',
  attrs: { level },
  content: [{ type: 'text', text }],
});
const paragraph = (text: string): JSONContent => ({
  type: 'paragraph',
  content: [{ type: 'text', text }],
});
const task = (text: string, checked = false): JSONContent => ({
  type: 'taskItem',
  attrs: { checked },
  content: [paragraph(text)],
});

/** First-run content so the app is not an empty screen. */
export function createDemoData(now = new Date()): { logbooks: Logbook[]; entries: Entry[] } {
  const iso = now.toISOString();
  const logbook: Logbook = {
    id: crypto.randomUUID(),
    title: 'LoKI – beamtime 2026-2 (demo)',
    description:
      'Example logbook. Try pasting from Word, dropping in a screenshot, or opening Version history.',
    instrument: 'LoKI',
    proposalId: '2026-0412',
    visibility: 'private',
    members: [
      { user: anna, role: 'owner' },
      { user: jon, role: 'editor' },
      { user: mei, role: 'viewer' },
    ],
    createdAt: iso,
    updatedAt: iso,
  };
  const entry: Entry = {
    id: crypto.randomUUID(),
    logbookId: logbook.id,
    title: 'Day 1 – alignment and first runs',
    revision: 1,
    createdAt: iso,
    updatedAt: iso,
    updatedBy: anna,
    content: {
      type: 'doc',
      content: [
        heading('Plan'),
        {
          type: 'taskList',
          content: [
            task('Align sample stage', true),
            task('Run empty-can background'),
            task('Measure sample series A'),
          ],
        },
        heading('Sample'),
        {
          type: 'sampleInfo',
          attrs: {
            proposalId: '2026-0412',
            proposalTitle: 'Micelle structure under shear',
            sampleId: 'S-0031',
            sampleName: 'SDS 5 wt% in D2O',
            formula: 'C12H25NaO4S',
            instrument: 'LoKI',
          },
        },
        heading('Notes'),
        paragraph('Use the toolbar above, or paste content from Word, Excel or another web page.'),
      ],
    },
  };
  return { logbooks: [logbook], entries: [entry] };
}
