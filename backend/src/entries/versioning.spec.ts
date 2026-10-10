import { AUTO_VERSION_INTERVAL_MS, autoVersionDue } from './versioning.js';

const now = new Date('2026-10-10T12:00:00Z');
const ago = (ms: number) => new Date(now.getTime() - ms);
const entry = { title: 'Run 1', content: { type: 'doc' } };

describe('autoVersionDue', () => {
  it('takes the first version straight away', () => {
    expect(autoVersionDue(undefined, entry, now)).toBe(true);
  });

  it('waits until the last version is old enough', () => {
    const recent = { ...entry, title: 'Older', savedAt: ago(AUTO_VERSION_INTERVAL_MS - 1000) };
    expect(autoVersionDue(recent, entry, now)).toBe(false);
  });

  it('takes a version once the interval has passed and the entry has changed', () => {
    const old = { ...entry, title: 'Older', savedAt: ago(AUTO_VERSION_INTERVAL_MS) };
    expect(autoVersionDue(old, entry, now)).toBe(true);
  });

  it('does not copy an entry that has not changed', () => {
    const same = { ...entry, savedAt: ago(AUTO_VERSION_INTERVAL_MS * 2) };
    expect(autoVersionDue(same, entry, now)).toBe(false);
  });
});
