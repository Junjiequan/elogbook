import { inject, Injectable } from '@angular/core';
import type { User } from '../app/core/models/logbook.models';
import { LogbookRepository } from '../app/core/data-access/logbook.repository';
import { createDemoLogbooks } from './demo-set';

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
    const existing = new Set((await this.repository.listLogbooks(user)).map((l) => l.id));
    for (const bundle of createDemoLogbooks(user)) {
      if (!existing.has(bundle.logbook.id)) {
        await this.repository.importLogbook(bundle);
      }
    }
    this.markSeeded(user);
  }

  private alreadySeeded(user: User): boolean {
    try {
      return localStorage.getItem(demoSeededKey(user)) === 'true';
    } catch {
      return false;
    }
  }

  private markSeeded(user: User): void {
    try {
      localStorage.setItem(demoSeededKey(user), 'true');
    } catch {
      // storage unavailable: demo logbooks may reappear after a reload; harmless
    }
  }
}
