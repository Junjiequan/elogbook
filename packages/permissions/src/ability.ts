import {
  AbilityBuilder,
  createMongoAbility,
  type ForcedSubject,
  type MongoAbility,
  type MongoQuery,
  subject,
} from '@casl/ability';
import type { AbilityUser, Action, LogbookLike, MemberRole } from './types.js';

/** The logbook as the rules see it: members always carry `userId`. */
interface LogbookShape {
  visibility: LogbookLike['visibility'];
  demo?: boolean;
  members: { userId: string; role: MemberRole }[];
}

/** An entry has the permissions of the logbook it lives in. */
interface EntryShape {
  logbook: LogbookShape;
}

export type LogbookSubject = LogbookShape & ForcedSubject<'Logbook'>;
export type EntrySubject = EntryShape & ForcedSubject<'Entry'>;
export type AppAbility = MongoAbility<
  [Action, 'Logbook' | 'Entry' | LogbookSubject | EntrySubject]
>;

const memberId = (member: LogbookLike['members'][number]): string =>
  (member.userId ?? member.user?.id) as string;

const toShape = (logbook: LogbookLike): LogbookShape => ({
  visibility: logbook.visibility,
  demo: logbook.demo,
  members: logbook.members.map((member) => ({ userId: memberId(member), role: member.role })),
});

/** Wraps a logbook so `ability.can('read', logbookSubject(logbook))` knows what it is. */
export const logbookSubject = (logbook: LogbookLike): LogbookSubject =>
  subject('Logbook', toShape(logbook));

/** The same for an entry: pass the logbook it lives in. */
export const entrySubject = (logbook: LogbookLike): EntrySubject =>
  subject('Entry', { logbook: toShape(logbook) });

/**
 * THE rules: who may do what with logbooks and entries. Everything else (the API's checks, the app's
 * buttons) asks the ability this returns, so a rule changes in exactly this function.
 *
 * Entries are described by their logbook, so the two share one set of conditions with a path prefix
 * (`members` for a logbook, `logbook.members` for an entry).
 */
export function defineAbilityFor(user: AbilityUser): AppAbility {
  const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

  can('create', 'Logbook');

  for (const [name, prefix] of [
    ['Logbook', ''],
    ['Entry', 'logbook.'],
  ] as const) {
    const member = (roles?: MemberRole[]): MongoQuery => ({
      [`${prefix}members`]: {
        $elemMatch: roles ? { userId: user.id, role: { $in: roles } } : { userId: user.id },
      },
    });
    // The facility-wide rule does not apply to demo logbooks: they are personal copies.
    const facility: MongoQuery = {
      [`${prefix}visibility`]: 'facility-read',
      [`${prefix}demo`]: { $ne: true },
    };

    can('read', name, member());
    can('read', name, facility);
    can('write', name, member(['owner', 'editor']));
    can('delete', name, member(['owner']));
    if (user.isAdmin) {
      // An administrator may delete what they can open, not everything that exists.
      can('delete', name, member());
      can('delete', name, facility);
    }
  }
  can('configure', 'Logbook', {
    members: { $elemMatch: { userId: user.id, role: 'owner' } },
  });

  return build();
}

/**
 * The person's role on a logbook, for showing ("Owner", "Viewer") and for sorting members: their own
 * membership, or `viewer` when they can only read it because it is open to the facility.
 */
export function roleOf(logbook: LogbookLike, userId: string): MemberRole | null {
  const member = logbook.members.find((m) => memberId(m) === userId);
  if (member) {
    return member.role;
  }
  return defineAbilityFor({ id: userId, isAdmin: false }).can('read', logbookSubject(logbook))
    ? 'viewer'
    : null;
}
