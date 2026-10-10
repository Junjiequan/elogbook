export type MemberRole = 'owner' | 'editor' | 'viewer';

/** `private`: only the listed members. `facility-read`: any signed-in person may read. */
export type Visibility = 'private' | 'facility-read';

/**
 * What a person can do:
 * - `read`: open a logbook or entry.
 * - `write`: create and change entries (owners and editors).
 * - `configure`: change the logbook's settings and members (owners).
 * - `delete`: delete a logbook or entry (owners, and administrators for what they can open).
 * - `create`: start a new logbook (anyone signed in).
 */
export type Action = 'read' | 'write' | 'configure' | 'delete' | 'create';

/** The person asking. */
export interface AbilityUser {
  id: string;
  isAdmin: boolean;
}

/** A member as the API holds it (`userId`) or as the app holds it (`user.id`). */
export interface MemberLike {
  role: MemberRole;
  userId?: string;
  user?: { id: string };
}

/** Anything shaped like a logbook: the API's entity or the app's model. */
export interface LogbookLike {
  visibility: Visibility;
  members: readonly MemberLike[];
  /** Sample content generated for a new user: personal, so the facility-wide rule does not apply. */
  demo?: boolean;
}
