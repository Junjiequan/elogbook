import type { Logbook, User } from '../models/logbook.models';
import { canManage, canRead, canWrite, roleOf } from './permissions';

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

  it('lets anyone read, but not write, a facility-read logbook', () => {
    const book = logbook('facility-read');
    expect(canRead(book, stranger)).toBeTrue();
    expect(canWrite(book, stranger)).toBeFalse();
  });
});
