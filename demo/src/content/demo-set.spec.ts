import { createDemoLogbooks } from './demo-set.js';
import type { JSONContent, User } from './demo.types.js';

const user: User = { id: 'u1', name: 'Test User', email: 'test@example.org' };
const now = new Date('2026-10-10T12:00:00Z');

/** The node and mark types the editor can show (StarterKit, tables, task lists, images, sample blocks). */
const EDITOR_NODES = new Set([
  'blockquote',
  'bulletList',
  'codeBlock',
  'doc',
  'hardBreak',
  'heading',
  'horizontalRule',
  'image',
  'listItem',
  'orderedList',
  'paragraph',
  'sampleInfo',
  'table',
  'tableCell',
  'tableHeader',
  'tableRow',
  'taskItem',
  'taskList',
  'text',
]);
const EDITOR_MARKS = new Set([
  'bold',
  'code',
  'highlight',
  'italic',
  'link',
  'strike',
  'underline',
]);

describe('the demo content', () => {
  const bundles = createDemoLogbooks(user, now);

  it('is enough logbooks to need paging, each with entries', () => {
    // Not an exact number: how many there are is for the content to decide, and tests that depend on it break
    // whenever someone adds one. (The API tests compare with what this set contains.)
    expect(bundles.length).toBeGreaterThanOrEqual(20);
    for (const { logbook, entries } of bundles) {
      expect(logbook.demo, logbook.title).toBe(true);
      expect(entries.length, logbook.title).toBeGreaterThan(0);
    }
  });

  it('has unique ids, and every entry and version points at what it belongs to', () => {
    const logbookIds = bundles.map((b) => b.logbook.id);
    const entryIds = bundles.flatMap((b) => b.entries.map((e) => e.id));
    const versionIds = bundles.flatMap((b) => b.versions.map((v) => v.id));
    for (const ids of [logbookIds, entryIds, versionIds]) {
      expect(new Set(ids).size).toBe(ids.length);
    }
    for (const { logbook, entries, versions } of bundles) {
      expect(entries.every((e) => e.logbookId === logbook.id)).toBe(true);
      expect(versions.every((v) => entries.some((e) => e.id === v.entryId))).toBe(true);
    }
  });

  it('gives the person a role in every logbook, and each logbook an owner', () => {
    for (const { logbook } of bundles) {
      const emails = logbook.members.map((m) => m.user.email);
      expect(emails, logbook.title).toContain(user.email);
      expect(new Set(emails).size, `duplicate member in ${logbook.title}`).toBe(emails.length);
      expect(
        logbook.members.some((m) => m.role === 'owner'),
        logbook.title,
      ).toBe(true);
    }
  });

  it('is never dated in the future, and entries are not older than their logbook', () => {
    for (const { logbook, entries, versions } of bundles) {
      for (const date of [
        logbook.createdAt,
        logbook.updatedAt,
        ...entries.map((e) => e.updatedAt),
        ...versions.map((v) => v.savedAt),
      ]) {
        expect(new Date(date).getTime(), logbook.title).toBeLessThanOrEqual(now.getTime());
      }
    }
  });

  it('uses only things the editor can show', () => {
    const nodes = new Set<string>();
    const marks = new Set<string>();
    const walk = (node: JSONContent) => {
      if (node.type) nodes.add(node.type);
      node.marks?.forEach((m) => marks.add(m.type));
      node.content?.forEach(walk);
    };
    for (const { entries, versions } of bundles) {
      [...entries, ...versions].forEach((x) => walk(x.content));
    }
    expect([...nodes].filter((n) => !EDITOR_NODES.has(n))).toEqual([]);
    expect([...marks].filter((m) => !EDITOR_MARKS.has(m))).toEqual([]);
  });

  it('makes a different set of ids for each person', () => {
    const other = createDemoLogbooks({ ...user, id: 'u2' }, now);
    expect(other[0].logbook.id).not.toBe(bundles[0].logbook.id);
  });
});
