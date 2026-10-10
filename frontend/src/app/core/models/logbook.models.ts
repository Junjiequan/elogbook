import type { JSONContent } from '@tiptap/core';

export type MemberRole = 'owner' | 'editor' | 'viewer';

/** `private`: only listed members. `facility-read`: any signed-in facility user may read. */
export type Visibility = 'private' | 'facility-read';

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface LogbookMember {
  user: User;
  role: MemberRole;
}

export interface Logbook {
  id: string;
  title: string;
  description: string;
  instrument: string | null;
  proposalId: string | null;
  visibility: Visibility;
  /** The person responsible for the logbook; also in `members`, with the `owner` role. */
  owner: User;
  members: LogbookMember[];
  /**
   * What the signed-in person may do with this logbook. The server works it out and sends it, so the
   * screens never apply permission rules themselves (the server enforces them anyway).
   */
  myRole: MemberRole | null;
  canWrite: boolean;
  canConfigure: boolean;
  canDelete: boolean;
  createdAt: string;
  updatedAt: string;
}

export type NewLogbook = Pick<Logbook, 'title' | 'description' | 'instrument' | 'proposalId'>;

export type LogbookSettingsPatch = Partial<
  Pick<Logbook, 'title' | 'description' | 'visibility' | 'members'>
>;

/** How many entries one person can pin. A short list stays useful; a long one is just another list. */
export const MAX_PINNED_ENTRIES = 4;

/** An entry the person has pinned, with where it lives: what the list page's "Pinned" panel shows. */
export interface PinnedEntry {
  entryId: string;
  entryTitle: string;
  logbookId: string;
  logbookTitle: string;
  instrument: string | null;
  pinnedAt: string;
  /** When the entry itself was last changed (not when it was pinned), and by whom. */
  updatedAt: string;
  updatedBy: User;
}

export interface Entry {
  id: string;
  logbookId: string;
  title: string;
  content: JSONContent;
  /** Incremented on every save; lets a future backend detect conflicting writes. */
  revision: number;
  createdAt: string;
  updatedAt: string;
  updatedBy: User;
}

export type EntryChanges = Partial<Pick<Entry, 'title' | 'content'>>;

export type VersionReason = 'auto' | 'manual' | 'restore';

export interface EntryVersion {
  id: string;
  entryId: string;
  title: string;
  content: JSONContent;
  savedAt: string;
  savedBy: User;
  reason: VersionReason;
}
