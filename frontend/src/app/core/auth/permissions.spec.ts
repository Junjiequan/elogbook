import type { Logbook, User } from '../models/logbook.models';
import { canDelete, canManage, canRead, canWrite, roleOf } from './permissions';

const user = (id: string): User => ({ id, name: id, email: `${id}@example.org` });
const [owner, editor, viewer, stranger] = ['owner', 'editor', 'viewer', 'stranger'].map(user);

const logbook = (visibility: Logbook['visibility']): Logbook => ({
  id: 'l1',
  title: 'T',
  description: '',
  instrument: null,
  proposalId: null,
  visibility,
  members: [
    { user: owner, role: 'owner' },
    { user: editor, role: 'editor' },
    { user: viewer, role: 'viewer' },
  ],
  createdAt: '',
  updatedAt: '',
});

describe('permissions', () => {
  it('gives members their role', () => {
    const book = logbook('private');
    expect(roleOf(book, owner)).toBe('owner');
    expect(canWrite(book, editor)).toBeTrue();
    expect(canWrite(book, viewer)).toBeFalse();
    expect(canManage(book, editor)).toBeFalse();
    expect(canManage(book, owner)).toBeTrue();
  });

  it('hides private logbooks from non-members', () => {
    expect(canRead(logbook('private'), stranger)).toBeFalse();
  });

  it('does not apply the facility-wide rule to personal demo logbooks', () => {
    expect(canRead({ ...logbook('facility-read'), demo: true }, stranger)).toBeFalse();
  });

  it('lets anyone read, but not write, a facility-read logbook', () => {
    const book = logbook('facility-read');
    expect(canRead(book, stranger)).toBeTrue();
    expect(canWrite(book, stranger)).toBeFalse();
  });

  it('lets only the owner or an administrator delete a logbook', () => {
    const book = logbook('private');
    expect(canDelete(book, owner, false)).toBeTrue();
    expect(canDelete(book, editor, false)).toBeFalse();
    expect(canDelete(book, viewer, false)).toBeFalse();
    expect(canDelete(book, stranger, false)).toBeFalse();
  });

  it('lets an administrator delete only what they can open', () => {
    expect(canDelete(logbook('private'), stranger, true)).toBeFalse();
    expect(canDelete(logbook('facility-read'), stranger, true)).toBeTrue();
    expect(canDelete(logbook('private'), viewer, true)).toBeTrue();
  });
});
