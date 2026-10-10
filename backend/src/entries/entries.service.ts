import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { type Action, entrySubject } from '@elogbook/permissions';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, type EntityManager } from 'typeorm';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity.js';
import type { JwtUser } from '../auth/interfaces/jwt-user.interface.js';
import { CaslAbilityFactory } from '../casl/casl-ability.factory.js';
import { LogbooksService } from '../logbooks/logbooks.service.js';
import type { UpdateEntryDto } from './dto/update-entry.dto.js';
import { EntryVersion, type VersionReason } from './entities/entry-version.entity.js';
import { EMPTY_CONTENT, Entry } from './entities/entry.entity.js';
import { type EntryDto, type EntryVersionDto, toEntryDto, toVersionDto } from './entry.mapper.js';
import { autoVersionDue } from './versioning.js';

@Injectable()
export class EntriesService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly logbooks: LogbooksService,
    private readonly casl: CaslAbilityFactory,
  ) {}

  /** Newest first, as the sidebar shows them. */
  async list(user: JwtUser, logbookId: string): Promise<EntryDto[]> {
    await this.logbooks.requireAccess(user, logbookId, 'read');
    const entries = await this.dataSource.getRepository(Entry).find({
      where: { logbookId },
      relations: { updatedBy: true },
      order: { createdAt: 'DESC' },
    });
    return entries.map(toEntryDto);
  }

  async create(user: JwtUser, logbookId: string): Promise<EntryDto> {
    await this.logbooks.requireAccess(user, logbookId, 'write');
    const entry = await this.dataSource.getRepository(Entry).save({
      logbookId,
      title: '',
      content: EMPTY_CONTENT,
      revision: 1,
      updatedById: user.id,
    });
    return toEntryDto(await this.load(entry.id));
  }

  async get(user: JwtUser, id: string): Promise<EntryDto> {
    return toEntryDto((await this.requireEntry(user, id, 'read')).entry);
  }

  /**
   * Saves the changes if nobody else saved since `dto.revision`; otherwise 409 with the revision that
   * is current, so the client can reload instead of overwriting someone else's work. The check and the
   * write are one statement, so there is no gap for a second save to slip into.
   */
  async save(user: JwtUser, id: string, dto: UpdateEntryDto): Promise<EntryDto> {
    await this.requireEntry(user, id, 'write');
    return this.dataSource.transaction(async (manager) => {
      const updated = await this.apply(manager, id, user, dto, dto.revision);
      await this.snapshotIfDue(manager, updated, user);
      return toEntryDto(updated);
    });
  }

  async remove(user: JwtUser, id: string): Promise<void> {
    await this.requireEntry(user, id, 'delete');
    // Versions and pins go with it (ON DELETE CASCADE).
    await this.dataSource.getRepository(Entry).delete({ id });
  }

  // ── version history ─────────────────────────────────────────────────────────

  async listVersions(user: JwtUser, entryId: string): Promise<EntryVersionDto[]> {
    await this.requireEntry(user, entryId, 'read');
    const versions = await this.dataSource.getRepository(EntryVersion).find({
      where: { entryId },
      relations: { savedBy: true },
      order: { savedAt: 'DESC' },
    });
    return versions.map(toVersionDto);
  }

  async createVersion(
    user: JwtUser,
    entryId: string,
    reason: VersionReason = 'manual',
  ): Promise<EntryVersionDto> {
    const { entry } = await this.requireEntry(user, entryId, 'write');
    const { id } = await this.snapshot(this.dataSource.manager, entry, user, reason);
    return toVersionDto(
      await this.dataSource
        .getRepository(EntryVersion)
        .findOneOrFail({ where: { id }, relations: { savedBy: true } }),
    );
  }

  /** Keeps what is being replaced as a version first, so a restore can itself be undone. */
  async restoreVersion(user: JwtUser, entryId: string, versionId: string): Promise<EntryDto> {
    await this.requireEntry(user, entryId, 'write');
    return this.dataSource.transaction(async (manager) => {
      const version = await manager.findOneBy(EntryVersion, { id: versionId, entryId });
      if (!version) {
        throw new NotFoundException('Version not found.');
      }
      const current = await manager
        .createQueryBuilder(Entry, 'entry')
        .setLock('pessimistic_write')
        .where('entry.id = :entryId', { entryId })
        .getOneOrFail();
      await this.snapshot(manager, current, user, 'restore');
      const restored = await this.apply(manager, entryId, user, {
        title: version.title,
        content: version.content,
      });
      return toEntryDto(restored);
    });
  }

  // ── helpers ─────────────────────────────────────────────────────────────────

  private async apply(
    manager: EntityManager,
    id: string,
    user: JwtUser,
    changes: Pick<UpdateEntryDto, 'title' | 'content'>,
    expectedRevision?: number,
  ): Promise<Entry> {
    const query = manager
      .createQueryBuilder()
      .update(Entry)
      .set({
        title: changes.title,
        // jsonb: the whole document is written as given (TypeORM's partial type would reject the open shape).
        content: changes.content as QueryDeepPartialEntity<Entry>['content'],
        updatedById: user.id,
        revision: () => 'revision + 1',
        updatedAt: () => 'now()',
      })
      .where('id = :id', { id });
    if (expectedRevision !== undefined) {
      query.andWhere('revision = :expectedRevision', { expectedRevision });
    }
    const { affected } = await query.execute();
    if (!affected) {
      const current = await manager.findOneBy(Entry, { id });
      if (!current) {
        throw new NotFoundException('Entry not found.');
      }
      throw new ConflictException({
        statusCode: 409,
        error: 'Conflict',
        message:
          'Someone else saved this entry after you opened it. Reload it to see their changes.',
        currentRevision: current.revision,
      });
    }
    return manager.findOneOrFail(Entry, { where: { id }, relations: { updatedBy: true } });
  }

  private async snapshotIfDue(manager: EntityManager, entry: Entry, user: JwtUser): Promise<void> {
    const latest = await manager.findOne(EntryVersion, {
      where: { entryId: entry.id },
      order: { savedAt: 'DESC' },
    });
    if (autoVersionDue(latest ?? undefined, entry, new Date())) {
      await this.snapshot(manager, entry, user, 'auto');
    }
  }

  private snapshot(
    manager: EntityManager,
    entry: Entry,
    user: JwtUser,
    reason: VersionReason,
  ): Promise<EntryVersion> {
    return manager.save(
      manager.create(EntryVersion, {
        entryId: entry.id,
        title: entry.title,
        content: entry.content,
        savedById: user.id,
        reason,
      }),
    );
  }

  private load(id: string): Promise<Entry> {
    return this.dataSource
      .getRepository(Entry)
      .findOneOrFail({ where: { id }, relations: { updatedBy: true } });
  }

  /**
   * The entry and its logbook, when the person may do `action` with it. As with logbooks, an entry in
   * a logbook they cannot open is "not found"; one they can open but not change is "forbidden".
   */
  private async requireEntry(user: JwtUser, id: string, action: Exclude<Action, 'create'>) {
    const entry = await this.dataSource
      .getRepository(Entry)
      .findOne({ where: { id }, relations: { updatedBy: true } });
    if (!entry) {
      throw new NotFoundException('Entry not found.');
    }
    const logbook = await this.logbooks.requireAccess(user, entry.logbookId, 'read');
    if (!this.casl.createForUser(user).can(action, entrySubject(logbook))) {
      throw new ForbiddenException(DENIED[action]);
    }
    return { entry, logbook };
  }
}

const DENIED: Record<Exclude<Action, 'create'>, string> = {
  read: 'You cannot open this entry.',
  write: 'You can read this logbook but not change it.',
  configure: 'Entries have no settings.',
  delete: 'Only an owner or an administrator can delete an entry.',
};
