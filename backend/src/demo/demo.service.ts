import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, type EntityManager } from 'typeorm';
import type { JwtUser } from '../auth/interfaces/jwt-user.interface.js';
import type { AppConfig } from '../config/configuration.js';
import { EntryVersion } from '../entries/entities/entry-version.entity.js';
import { Entry } from '../entries/entities/entry.entity.js';
import { LogbookMember } from '../logbooks/entities/logbook-member.entity.js';
import { Logbook } from '../logbooks/entities/logbook.entity.js';
import { PinnedEntry } from '../pins/entities/pinned-entry.entity.js';
import { MAX_PINNED_ENTRIES } from '../pins/pins.service.js';
import { UsersService, normaliseEmail } from '../users/users.service.js';
import { createDemoLogbooks } from './demo-set.js';
import type { LogbookBundle, User } from './demo.types.js';
import { stableUuid } from './stable-uuid.js';

/** Entries pinned for someone who has pinned nothing, so the "Pinned entries" panel has something to show. */
export const DEMO_PINNED_TITLES = [
  'Handover checklist and data management',
  'Shear cell commissioning',
  'Pristine vs 500 cycles',
];

export interface DemoStatus {
  /** Sample logbooks the person has right now. */
  logbooks: number;
}

@Injectable()
export class DemoService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly users: UsersService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  async status(user: JwtUser): Promise<DemoStatus> {
    this.assertEnabled();
    return {
      logbooks: await this.dataSource.getRepository(Logbook).countBy({ demoUserId: user.id }),
    };
  }

  /**
   * Makes the sample logbooks for the person: a detailed beamtime and a spread of smaller ones, with
   * entries, version history and a few pins. Safe to repeat: a logbook that is already there is left as
   * it is (the person's edits stay), and only missing ones are added.
   */
  async populate(user: JwtUser): Promise<{ created: number; total: number }> {
    this.assertEnabled();
    const me: User = { id: user.id, name: user.name, email: user.email };
    const bundles = createDemoLogbooks(me, new Date());

    const created = await this.dataSource.transaction(async (manager) => {
      const people = await this.users.ensurePeople(this.peopleIn(bundles), manager);
      const idOf = (person: User): string => people.get(normaliseEmail(person.email))!.id;

      let made = 0;
      for (const bundle of bundles) {
        const logbookId = stableUuid(`${me.id}:${bundle.logbook.id}`);
        if (await manager.existsBy(Logbook, { id: logbookId })) {
          continue;
        }
        await this.insertBundle(manager, bundle, logbookId, me, idOf);
        made += 1;
      }
      if (made > 0) {
        await this.pinDefaults(manager, user.id);
      }
      return made;
    });
    return { created, total: bundles.length };
  }

  /** Removes the person's sample logbooks, with their entries, versions and pins. Nothing else. */
  async remove(user: JwtUser): Promise<void> {
    this.assertEnabled();
    await this.dataSource.getRepository(Logbook).delete({ demoUserId: user.id });
  }

  private assertEnabled(): void {
    if (!this.config.get('demo.enabled', { infer: true })) {
      throw new NotFoundException();
    }
  }

  /** Everyone named in the content: members, and whoever wrote or saved something. */
  private peopleIn(bundles: LogbookBundle[]): { email: string; name: string }[] {
    const all = bundles.flatMap(({ logbook, entries, versions }) => [
      ...logbook.members.map((m) => m.user),
      ...entries.map((e) => e.updatedBy),
      ...versions.map((v) => v.savedBy),
    ]);
    return [...new Map(all.map((p) => [normaliseEmail(p.email), p])).values()];
  }

  private async insertBundle(
    manager: EntityManager,
    { logbook, entries, versions }: LogbookBundle,
    logbookId: string,
    me: User,
    idOf: (person: User) => string,
  ): Promise<void> {
    const entryId = (id: string) => stableUuid(`${me.id}:entry:${id}`);

    await manager.insert(Logbook, {
      id: logbookId,
      title: logbook.title,
      description: logbook.description,
      instrument: logbook.instrument,
      proposalId: logbook.proposalId,
      visibility: logbook.visibility,
      ownerId: idOf((logbook.members.find((m) => m.role === 'owner') ?? { user: me }).user),
      demoUserId: me.id,
      createdAt: new Date(logbook.createdAt),
      updatedAt: new Date(logbook.updatedAt),
    });
    const members = new Map(logbook.members.map((m) => [idOf(m.user), m.role]));
    await manager.insert(
      LogbookMember,
      [...members].map(([userId, role]) => ({ logbookId, userId, role })),
    );
    if (entries.length > 0) {
      await manager.insert(
        Entry,
        entries.map((e) => ({
          id: entryId(e.id),
          logbookId,
          title: e.title,
          content: e.content,
          revision: e.revision,
          createdAt: new Date(e.createdAt),
          updatedAt: new Date(e.updatedAt),
          updatedById: idOf(e.updatedBy),
        })),
      );
    }
    if (versions.length > 0) {
      await manager.insert(
        EntryVersion,
        versions.map((v) => ({
          id: stableUuid(`${me.id}:version:${v.id}`),
          entryId: entryId(v.entryId),
          title: v.title,
          content: v.content,
          savedAt: new Date(v.savedAt),
          savedById: idOf(v.savedBy),
          reason: v.reason,
        })),
      );
    }
  }

  /** Someone who has pinned nothing gets a few sample pins; anyone with pins of their own keeps only those. */
  private async pinDefaults(manager: EntityManager, userId: string): Promise<void> {
    if ((await manager.countBy(PinnedEntry, { userId })) > 0) {
      return;
    }
    const entries = await manager
      .createQueryBuilder(Entry, 'entry')
      .innerJoin('entry.logbook', 'logbook')
      .where('logbook.demo_user_id = :userId', { userId })
      .getMany();
    const picked = DEMO_PINNED_TITLES.flatMap((title) => {
      const found = entries.find((entry) => entry.title.startsWith(title));
      return found ? [found.id] : [];
    }).slice(0, MAX_PINNED_ENTRIES);
    if (picked.length > 0) {
      await manager.insert(
        PinnedEntry,
        picked.map((entryId, position) => ({ userId, entryId, position })),
      );
    }
  }
}
