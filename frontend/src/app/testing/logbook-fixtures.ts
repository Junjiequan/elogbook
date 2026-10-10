import type { Logbook, LogbookMember, User, Visibility } from '../core/models/logbook.models';

type Access = Pick<Logbook, 'myRole' | 'canWrite' | 'canConfigure' | 'canDelete'>;

/** What the server sends for a logbook the person owns. */
export const OWNER_ACCESS: Access = {
  myRole: 'owner',
  canWrite: true,
  canConfigure: true,
  canDelete: true,
};

/**
 * What the server would say a person may do with a logbook, for tests that need roles to differ:
 * owners manage and delete; editors write; viewers read. (Administrators may delete what they can open.)
 */
export function accessFor(
  logbook: { visibility: Visibility; members: LogbookMember[]; demo?: boolean },
  user: User,
  isAdmin = false,
): Access {
  const own = logbook.members.find((m) => m.user.id === user.id)?.role ?? null;
  const open = logbook.visibility === 'facility-read' && !logbook.demo;
  const myRole = own ?? (open ? 'viewer' : null);
  return {
    myRole,
    canWrite: myRole === 'owner' || myRole === 'editor',
    canConfigure: myRole === 'owner',
    canDelete: myRole === 'owner' || (isAdmin && myRole !== null),
  };
}
