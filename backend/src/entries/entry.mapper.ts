import { toUserDto } from '../auth/auth.service.js';
import type { UserDto } from '../auth/interfaces/jwt-user.interface.js';
import type { EntryVersion, VersionReason } from './entities/entry-version.entity.js';
import type { Entry, EntryContent } from './entities/entry.entity.js';

/** The shapes the Angular app already uses (`core/models/logbook.models.ts`). */
export interface EntryDto {
  id: string;
  logbookId: string;
  title: string;
  content: EntryContent;
  revision: number;
  createdAt: string;
  updatedAt: string;
  updatedBy: UserDto;
}

export interface EntryVersionDto {
  id: string;
  entryId: string;
  title: string;
  content: EntryContent;
  savedAt: string;
  savedBy: UserDto;
  reason: VersionReason;
}

export const toEntryDto = (entry: Entry): EntryDto => ({
  id: entry.id,
  logbookId: entry.logbookId,
  title: entry.title,
  content: entry.content,
  revision: entry.revision,
  createdAt: entry.createdAt.toISOString(),
  updatedAt: entry.updatedAt.toISOString(),
  updatedBy: toUserDto(entry.updatedBy),
});

export const toVersionDto = (version: EntryVersion): EntryVersionDto => ({
  id: version.id,
  entryId: version.entryId,
  title: version.title,
  content: version.content,
  savedAt: version.savedAt.toISOString(),
  savedBy: toUserDto(version.savedBy),
  reason: version.reason,
});
