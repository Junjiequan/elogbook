import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AppConfig } from '../api/app-config';
import type {
  Entry,
  EntryChanges,
  EntryVersion,
  Logbook,
  LogbookSettingsPatch,
  NewLogbook,
  PinnedEntry,
} from '../models/logbook.models';
import { EntryConflictError, LogbookRepository, PinLimitReachedError } from './logbook.repository';

/** The eLogbook API (`backend/`). Every request carries the signed-in person's token (see `authInterceptor`). */
@Injectable()
export class HttpLogbookRepository extends LogbookRepository {
  private readonly http = inject(HttpClient);
  private readonly config = inject(AppConfig);

  private url(path: string): string {
    return `${this.config.apiUrl}${path}`;
  }

  override listLogbooks(): Promise<Logbook[]> {
    return firstValueFrom(this.http.get<Logbook[]>(this.url('/logbooks')));
  }

  override createLogbook(input: NewLogbook): Promise<Logbook> {
    return firstValueFrom(this.http.post<Logbook>(this.url('/logbooks'), input));
  }

  override updateLogbook(id: string, patch: LogbookSettingsPatch): Promise<Logbook> {
    // The API takes people by email; one who has not signed up yet is invited.
    const { members, ...rest } = patch;
    const body = {
      ...rest,
      ...(members && { members: members.map((m) => ({ email: m.user.email, role: m.role })) }),
    };
    return firstValueFrom(this.http.patch<Logbook>(this.url(`/logbooks/${id}`), body));
  }

  override deleteLogbook(id: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(this.url(`/logbooks/${id}`)));
  }

  override listEntries(logbookId: string): Promise<Entry[]> {
    return firstValueFrom(this.http.get<Entry[]>(this.url(`/logbooks/${logbookId}/entries`)));
  }

  override async getEntry(id: string): Promise<Entry | undefined> {
    try {
      return await firstValueFrom(this.http.get<Entry>(this.url(`/entries/${id}`)));
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 404) {
        return undefined;
      }
      throw error;
    }
  }

  override createEntry(logbookId: string): Promise<Entry> {
    return firstValueFrom(this.http.post<Entry>(this.url(`/logbooks/${logbookId}/entries`), {}));
  }

  override async saveEntry(id: string, changes: EntryChanges, revision: number): Promise<Entry> {
    try {
      return await firstValueFrom(
        this.http.patch<Entry>(this.url(`/entries/${id}`), { ...changes, revision }),
      );
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 409) {
        throw new EntryConflictError(error.error?.currentRevision);
      }
      throw error;
    }
  }

  override deleteEntry(id: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(this.url(`/entries/${id}`)));
  }

  override listPinnedEntries(): Promise<PinnedEntry[]> {
    return firstValueFrom(this.http.get<PinnedEntry[]>(this.url('/pins')));
  }

  override async isEntryPinned(entryId: string): Promise<boolean> {
    return (await this.listPinnedEntries()).some((pin) => pin.entryId === entryId);
  }

  override async setEntryPinned(entryId: string, pinned: boolean): Promise<void> {
    try {
      await firstValueFrom(
        pinned
          ? this.http.put<void>(this.url(`/pins/${entryId}`), {})
          : this.http.delete<void>(this.url(`/pins/${entryId}`)),
      );
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 409 && pinned) {
        throw new PinLimitReachedError();
      }
      throw error;
    }
  }

  override reorderPinnedEntries(entryIds: string[]): Promise<void> {
    return firstValueFrom(this.http.put<void>(this.url('/pins/order'), { entryIds }));
  }

  override listVersions(entryId: string): Promise<EntryVersion[]> {
    return firstValueFrom(this.http.get<EntryVersion[]>(this.url(`/entries/${entryId}/versions`)));
  }

  override createVersion(entryId: string): Promise<EntryVersion> {
    return firstValueFrom(
      this.http.post<EntryVersion>(this.url(`/entries/${entryId}/versions`), {}),
    );
  }

  override restoreVersion(entryId: string, versionId: string): Promise<Entry> {
    return firstValueFrom(
      this.http.post<Entry>(this.url(`/entries/${entryId}/versions/${versionId}/restore`), {}),
    );
  }
}
