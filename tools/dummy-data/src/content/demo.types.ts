/**
 * The shapes the demo builders produce: a logbook with its entries and version history, the same as
 * the Angular app's models (`logbook.models.ts`). `DemoService` turns them into database rows.
 */
export type MemberRole = 'owner' | 'editor' | 'viewer';
export type Visibility = 'private' | 'facility-read';

/** Rich-text document (TipTap/ProseMirror JSON). */
export interface JSONContent {
  type?: string;
  attrs?: Record<string, any>;
  content?: JSONContent[];
  marks?: { type: string; attrs?: Record<string, any> }[];
  text?: string;
  [key: string]: any;
}

/** A person. For colleagues in the demo content the id is their email. */
export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Logbook {
  id: string;
  title: string;
  description: string;
  instrument: string | null;
  proposalId: string | null;
  visibility: Visibility;
  members: { user: User; role: MemberRole }[];
  demo?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Entry {
  id: string;
  logbookId: string;
  title: string;
  content: JSONContent;
  revision: number;
  createdAt: string;
  updatedAt: string;
  updatedBy: User;
}

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

export interface LogbookBundle {
  logbook: Logbook;
  entries: Entry[];
  versions: EntryVersion[];
}
