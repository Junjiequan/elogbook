import { computed, Injectable, signal } from '@angular/core';
import type { User } from '../models/logbook.models';

const STORAGE_KEY = 'elogbook.currentUserId';

/** Development users. Replaced by the real identity provider (OIDC) once a backend exists. */
export const DEMO_USERS: readonly User[] = [
  { id: 'u-anna', name: 'Anna Lindqvist', email: 'anna.lindqvist@example.org' },
  { id: 'u-jon', name: 'Jon Carter', email: 'jon.carter@example.org' },
  { id: 'u-mei', name: 'Mei Tanaka', email: 'mei.tanaka@example.org' },
];

@Injectable({ providedIn: 'root' })
export class CurrentUserService {
  readonly users = DEMO_USERS;
  private readonly userId = signal(this.readStoredId() ?? DEMO_USERS[0].id);

  readonly user = computed(() => this.users.find((u) => u.id === this.userId()) ?? this.users[0]);

  switchTo(userId: string): void {
    this.userId.set(userId);
    try {
      localStorage.setItem(STORAGE_KEY, userId);
    } catch {
      // storage unavailable (private mode): the choice just won't survive a reload
    }
  }

  private readStoredId(): string | null {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  }
}
