import { inject, Injectable } from '@angular/core';
import type { User } from '../app/core/models/logbook.models';
import { LogbookRepository } from '../app/core/data-access/logbook.repository';
import { createDemoLogbooks } from './demo-set';

/**
 * Bump this when the demo content changes: people who were seeded with an older version get the new
 * logbooks, and the text and members of the ones they already have are brought up to date (their
 * entries are left alone).
 */
export const DEMO_VERSION = '2';

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
    this.markSeeded(user);
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
