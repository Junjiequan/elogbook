import { ConflictException, Injectable } from '@nestjs/common';
import { entrySubject } from '../casl/ability.js';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { toUserDto } from '../auth/auth.service.js';
import type { JwtUser, UserDto } from '../auth/interfaces/jwt-user.interface.js';
import { Entry } from '../entries/entities/entry.entity.js';
import { EntriesService } from '../entries/entries.service.js';
import { CaslAbilityFactory } from '../casl/casl-ability.factory.js';
import { User } from '../users/entities/user.entity.js';
import { PinnedEntry } from './entities/pinned-entry.entity.js';

/** How many entries one person can pin. A short list stays useful; a long one is just another list. */
export const MAX_PINNED_ENTRIES = 4;

/** An entry the person pinned, with where it lives: what the list page's "Pinned" panel shows. */
export interface PinnedEntryDto {
  entryId: string;
  entryTitle: string;
  logbookId: string;
  logbookTitle: string;
  instrument: string | null;
  pinnedAt: string;
  updatedAt: string;
  updatedBy: UserDto;
}

@Injectable()
export class PinsService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly entries: EntriesService,
    private readonly casl: CaslAbilityFactory,
  ) {}

  /** The person's pins in their own order. An entry they may no longer read is left out. */
  async list(user: JwtUser): Promise<PinnedEntryDto[]> {
    const pins = await this.dataSource.getRepository(PinnedEntry).find({
      where: { userId: user.id },
      order: { position: 'ASC', pinnedAt: 'ASC' },
    });
    if (pins.length === 0) {
      return [];
    }
    const found = await this.dataSource.getRepository(Entry).find({
      where: pins.map((pin) => ({ id: pin.entryId })),
      relations: { updatedBy: true, logbook: { members: true } },
    });
    const ability = this.casl.createForUser(user);
    const byId = new Map(found.map((entry) => [entry.id, entry]));
    return pins.flatMap((pin) => {
      const entry = byId.get(pin.entryId);
      if (!entry || !ability.can('read', entrySubject(entry.logbook))) {
        return [];
      }
      return [
        {
          entryId: entry.id,
          entryTitle: entry.title,
          logbookId: entry.logbook.id,
          logbookTitle: entry.logbook.title,
          instrument: entry.logbook.instrument,
          pinnedAt: pin.pinnedAt.toISOString(),
          updatedAt: entry.updatedAt.toISOString(),
          updatedBy: toUserDto(entry.updatedBy),
        },
      ];
    });
  }

  /** Pins the entry (last in the person's order). Pinning twice does nothing; a fifth is refused. */
  async pin(user: JwtUser, entryId: string): Promise<void> {
    await this.entries.get(user, entryId); // must exist and be readable
    await this.dataSource.transaction(async (manager) => {
      // Lock the person's row, so two pins made at the same moment cannot both slip under the limit.
      await manager
        .createQueryBuilder(User, 'user')
        .setLock('pessimistic_write')
        .where('user.id = :id', { id: user.id })
        .getOneOrFail();
      const mine = await manager.find(PinnedEntry, { where: { userId: user.id } });
      if (mine.some((pin) => pin.entryId === entryId)) {
        return;
      }
      if (mine.length >= MAX_PINNED_ENTRIES) {
        throw new ConflictException({
          statusCode: 409,
          error: 'Conflict',
          code: 'PIN_LIMIT_REACHED',
          message: 'The limit of pinned entries has been reached.',
        });
      }
      const next = mine.reduce((max, pin) => Math.max(max, pin.position + 1), 0);
      await manager.insert(PinnedEntry, { userId: user.id, entryId, position: next });
    });
  }

  async unpin(user: JwtUser, entryId: string): Promise<void> {
    await this.dataSource.getRepository(PinnedEntry).delete({ userId: user.id, entryId });
  }

  /** Stores the order: `entryIds` first to last, then any pin not named, in the order it had. */
  async reorder(user: JwtUser, entryIds: string[]): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const mine = await manager.find(PinnedEntry, {
        where: { userId: user.id },
        order: { position: 'ASC', pinnedAt: 'ASC' },
      });
      const owned = new Set(mine.map((pin) => pin.entryId));
      const named = entryIds.filter((id) => owned.has(id));
      const rest = mine.map((pin) => pin.entryId).filter((id) => !named.includes(id));
      for (const [position, entryId] of [...named, ...rest].entries()) {
        await manager.update(PinnedEntry, { userId: user.id, entryId }, { position });
      }
    });
  }
}
