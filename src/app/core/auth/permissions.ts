import type { Logbook, MemberRole, User } from '../models/logbook.models';

/**
 * Resolves the effective role of a user on a logbook.
 * UX-only: the backend must enforce the same rules once it exists.
 */
export function roleOf(logbook: Logbook, user: User): MemberRole | null {
  const member = logbook.members.find((m) => m.user.id === user.id);
  if (member) {
    return member.role;
  }
  return logbook.visibility === 'facility-read' ? 'viewer' : null;
}

export function canRead(logbook: Logbook, user: User): boolean {
  return roleOf(logbook, user) !== null;
}

export function canWrite(logbook: Logbook, user: User): boolean {
  const role = roleOf(logbook, user);
  return role === 'owner' || role === 'editor';
}

export function canManage(logbook: Logbook, user: User): boolean {
  return roleOf(logbook, user) === 'owner';
}
