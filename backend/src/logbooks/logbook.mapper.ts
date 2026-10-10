import { type AppAbility, logbookSubject, roleOf } from '@elogbook/permissions';
import { toUserDto } from '../auth/auth.service.js';
import type { UserDto } from '../auth/interfaces/jwt-user.interface.js';
import type { LogbookMember, MemberRole } from './entities/logbook-member.entity.js';
import type { Logbook, Visibility } from './entities/logbook.entity.js';

/** The shape the Angular app already uses (`core/models/logbook.models.ts`). */
export interface LogbookDto {
  id: string;
  title: string;
  description: string;
  instrument: string | null;
  proposalId: string | null;
  visibility: Visibility;
  members: { user: UserDto; role: MemberRole }[];
  /** A sample logbook made by `POST /demo`. */
  demo: boolean;
  /** What the person asking may do, so a screen never has to work it out: the server decides. */
  myRole: MemberRole | null;
  canWrite: boolean;
  canConfigure: boolean;
  canDelete: boolean;
  createdAt: string;
  updatedAt: string;
}

const ROLE_ORDER: Record<MemberRole, number> = { owner: 0, editor: 1, viewer: 2 };

const byRoleThenName = (a: LogbookMember, b: LogbookMember) =>
  ROLE_ORDER[a.role] - ROLE_ORDER[b.role] || a.user.name.localeCompare(b.user.name);

export const toLogbookDto = (
  logbook: Logbook,
  ability: AppAbility,
  userId: string,
): LogbookDto => ({
  id: logbook.id,
  title: logbook.title,
  description: logbook.description,
  instrument: logbook.instrument,
  proposalId: logbook.proposalId,
  visibility: logbook.visibility,
  members: [...logbook.members]
    .sort(byRoleThenName)
    .map((member) => ({ user: toUserDto(member.user), role: member.role })),
  demo: logbook.demo,
  myRole: roleOf(logbook, userId),
  canWrite: ability.can('write', logbookSubject(logbook)),
  canConfigure: ability.can('configure', logbookSubject(logbook)),
  canDelete: ability.can('delete', logbookSubject(logbook)),
  createdAt: logbook.createdAt.toISOString(),
  updatedAt: logbook.updatedAt.toISOString(),
});
