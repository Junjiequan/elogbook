import { inject, Injectable } from '@angular/core';
import type { User } from '../app/core/models/logbook.models';
import { LogbookRepository } from '../app/core/data-access/logbook.repository';
import { createDemoLogbooks } from './demo-set';

/**
 * Bump this when the demo content changes: people who were seeded with an older version get the new
 * logbooks, and the text and members of the ones they already have are brought up to date (their
 * entries are left alone).
 */
export const DEMO_VERSION = '3';

/** Entries pinned for a new user, so the "Pinned entries" panel has something to show. */
export const DEMO_PINNED_TITLES = [
  'Handover checklist and data management',
  'Shear cell commissioning',
  'Pristine vs 500 cycles',
];

export const demoSeededKey = (user: User): string => `elogbook.demo-seeded.${user.id}`;

/**
 * Gives every user a set of realistic demo logbooks the first time they sign in.
 *
 * Each logbook has a stable id per user, so a missing one is added without duplicating the rest.
 * Once a seed has completed it is remembered, so a logbook the user later deletes stays deleted.
 * Optional: remove the provider in `app.config.ts` to turn this off.
 */
@Injectable()
export class DemoSeeder {
  private readonly repository = inject(LogbookRepository);
  private readonly inFlight = new Map<string, Promise<void>>();

  ensureFor(user: User): Promise<void> {
    let pending = this.inFlight.get(user.id);
    if (!pending) {
      pending = this.seed(user).finally(() => this.inFlight.delete(user.id));
      this.inFlight.set(user.id, pending);
    }
    return pending;
  }

  private async seed(user: User): Promise<void> {
    if (this.alreadySeeded(user)) {
      return;
    }
    const existing = new Map((await this.repository.listLogbooks(user)).map((l) => [l.id, l]));
    for (const { logbook, ...rest } of createDemoLogbooks(user)) {
      const current = existing.get(logbook.id);
      if (!current) {
        await this.repository.importLogbook({ logbook, ...rest });
      } else if (current.demo) {
        const { title, description, visibility, members } = logbook;
        await this.repository.updateLogbook(logbook.id, {
          title,
          description,
          visibility,
          members,
        });
      }
    }
    await this.pinDefaults(user);
    this.markSeeded(user);
  }

  /** Someone who has pinned nothing gets a few demo pins; anyone who already has pins keeps only theirs. */
  private async pinDefaults(user: User): Promise<void> {
    if ((await this.repository.listPinnedEntries(user)).length > 0) {
      return;
    }
    const found: { rank: number; entryId: string }[] = [];
    for (const logbook of await this.repository.listLogbooks(user)) {
      if (!logbook.demo) {
        continue;
      }
      for (const entry of await this.repository.listEntries(logbook.id)) {
        const rank = DEMO_PINNED_TITLES.findIndex((title) => entry.title.startsWith(title));
        if (rank >= 0) {
          found.push({ rank, entryId: entry.id });
        }
      }
    }
    // In the order of the list above, so the panel always starts the same way.
    for (const { entryId } of found.sort((a, b) => a.rank - b.rank)) {
      await this.repository.setEntryPinned(user, entryId, true);
    }
  }

  private alreadySeeded(user: User): boolean {
    try {
      return localStorage.getItem(demoSeededKey(user)) === DEMO_VERSION;
    } catch {
      return false;
    }
  }

  private markSeeded(user: User): void {
    try {
      localStorage.setItem(demoSeededKey(user), DEMO_VERSION);
    } catch {
      // storage unavailable: demo logbooks may reappear after a reload; harmless
    }
  }
}
