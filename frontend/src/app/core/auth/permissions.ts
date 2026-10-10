import { defineAbilityFor, logbookSubject, roleOf as roleOfLogbook } from '@elogbook/permissions';
import type { Logbook, MemberRole, User } from '../models/logbook.models';

/**
 * Who may do what with a logbook. The rules are not written here: they live in `@elogbook/permissions`
 * (`packages/permissions`), the same package the API uses, so a button and the server it calls cannot
 * disagree. These functions only fit that package to this app's `Logbook` and `User`.
 * UX-only: the backend enforces the rules for real.
 */
const can = (
  action: 'read' | 'write' | 'configure' | 'delete',
  logbook: Logbook,
  user: User,
  isAdmin = false,
): boolean => defineAbilityFor({ id: user.id, isAdmin }).can(action, logbookSubject(logbook));

/** The effective role of a user on a logbook (a viewer, when it is only open to the facility). */
export function roleOf(logbook: Logbook, user: User): MemberRole | null {
  return roleOfLogbook(logbook, user.id);
}

export const canRead = (logbook: Logbook, user: User): boolean => can('read', logbook, user);

export const canWrite = (logbook: Logbook, user: User): boolean => can('write', logbook, user);

/** Changing the settings and the members: owners. */
export const canManage = (logbook: Logbook, user: User): boolean => can('configure', logbook, user);

/** Owners and administrators may delete a logbook (an administrator only one they can open). */
export const canDelete = (logbook: Logbook, user: User, isAdmin: boolean): boolean =>
  can('delete', logbook, user, isAdmin);
