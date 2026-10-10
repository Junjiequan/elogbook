import type { JSONContent } from '@tiptap/core';
import type { MemberRole, User, Visibility } from '../app/core/models/logbook.models';

export interface EntrySpec {
  title: string;
  daysAgo: number;
  at: [hours: number, minutes: number];
  by: 'user' | 'owner';
  content: () => JSONContent;
}

export interface LogbookSpec {
  slug: string;
  title: string;
  description: string;
  instrument: string | null;
  proposalId: string | null;
  visibility: Visibility;
  /** The signed-in user's role. When not 'owner', `owner` below owns it. */
  role: MemberRole;
  owner?: User;
  /** Further people with access, on top of the user and the owner. */
  members?: { user: User; role: MemberRole }[];
  daysAgo: number;
  entries: EntrySpec[];
}
