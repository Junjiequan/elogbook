import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { type Action, logbookSubject } from '../casl/ability.js';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import type { JwtUser } from '../auth/interfaces/jwt-user.interface.js';
import { CaslAbilityFactory } from '../casl/casl-ability.factory.js';
import { UsersService } from '../users/users.service.js';
import type { CreateLogbookDto } from './dto/create-logbook.dto.js';
import type { UpdateLogbookDto } from './dto/update-logbook.dto.js';
import { LogbookMember, type MemberRole } from './entities/logbook-member.entity.js';
import { Logbook } from './entities/logbook.entity.js';
import { type LogbookDto, toLogbookDto } from './logbook.mapper.js';

const DENIED: Record<Exclude<Action, 'create'>, string> = {
  read: 'You cannot open this logbook.',
  write: 'You can read this logbook but not change it.',
  configure: 'Only an owner can change the settings of this logbook.',
  delete: 'Only an owner or an administrator can delete a logbook.',
};

@Injectable()
export class LogbooksService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly users: UsersService,
    private readonly casl: CaslAbilityFactory,
  ) {}

  /**
   * Every logbook the person can open, most recently updated first. The `WHERE` is the `read` rule of
   * `@elogbook/permissions` written as SQL (a member, or open to the facility); the
   * e2e spec "agrees with the permission rules" fails if the two ever drift apart.
   */
  async list(user: JwtUser): Promise<LogbookDto[]> {
    const logbooks = await this.dataSource
      .getRepository(Logbook)
      .createQueryBuilder('logbook')
      .leftJoinAndSelect('logbook.owner', 'owner')
      .leftJoinAndSelect('logbook.members', 'member')
      .leftJoinAndSelect('member.user', 'memberUser')
      .where(
        `logbook.visibility = 'facility-read' OR EXISTS (
           SELECT 1 FROM logbook_members mine
           WHERE mine.logbook_id = logbook.id AND mine.user_id = :userId)`,
        { userId: user.id },
      )
      .orderBy('logbook.updatedAt', 'DESC')
      .getMany();
    const ability = this.casl.createForUser(user);
    return logbooks.map((logbook) => toLogbookDto(logbook, ability, user.id));
  }

  async get(user: JwtUser, id: string): Promise<LogbookDto> {
    return toLogbookDto(
      await this.requireAccess(user, id, 'read'),
      this.casl.createForUser(user),
      user.id,
    );
  }

  async create(user: JwtUser, dto: CreateLogbookDto): Promise<LogbookDto> {
    if (!this.casl.createForUser(user).can('create', 'Logbook')) {
      throw new ForbiddenException('You cannot create logbooks.');
    }
    const id = await this.dataSource.transaction(async (manager) => {
      const logbook = await manager.save(
        manager.create(Logbook, {
          title: dto.title,
          description: dto.description ?? '',
          instrument: dto.instrument ?? null,
          proposalId: dto.proposalId ?? null,
          visibility: 'private',
          ownerId: user.id,
        }),
      );
      await manager.insert(LogbookMember, {
        logbookId: logbook.id,
        userId: user.id,
        role: 'owner',
      });
      return logbook.id;
    });
    return this.get(user, id);
  }

  async update(user: JwtUser, id: string, dto: UpdateLogbookDto): Promise<LogbookDto> {
    await this.requireAccess(user, id, 'configure');
    await this.dataSource.transaction(async (manager) => {
      // Lock the row, so two owners editing the member list at once are applied one after the other.
      const logbook = await manager
        .createQueryBuilder(Logbook, 'logbook')
        .setLock('pessimistic_write')
        .where('logbook.id = :id', { id })
        .getOneOrFail();

      if (dto.title !== undefined) logbook.title = dto.title;
      if (dto.description !== undefined) logbook.description = dto.description;
      if (dto.visibility !== undefined) logbook.visibility = dto.visibility;

      let wanted: Map<string, MemberRole> | undefined;
      if (dto.members) {
        const people = await this.users.ensureByEmails(
          dto.members.map((member) => member.email),
          manager,
        );
        wanted = new Map(
          dto.members.map((member) => [
            people.get(member.email.trim().toLowerCase())!.id,
            member.role,
          ]),
        );
        // Who owns the logbook follows from the member list: it needs an owner, and while the current
        // owner is still one they stay "the owner". Otherwise the logbook is handed to the first owner listed.
        const owners = [...wanted].filter(([, role]) => role === 'owner').map(([userId]) => userId);
        if (owners.length === 0) {
          throw new BadRequestException('A logbook needs at least one owner.');
        }
        if (!owners.includes(logbook.ownerId)) {
          logbook.ownerId = owners[0];
        }
      }
      logbook.updatedAt = new Date();
      await manager.save(Logbook, logbook);

      if (wanted) {
        await manager
          .createQueryBuilder()
          .delete()
          .from(LogbookMember)
          .where('logbook_id = :id AND user_id NOT IN (:...kept)', { id, kept: [...wanted.keys()] })
          .execute();
        await manager.upsert(
          LogbookMember,
          [...wanted].map(([userId, role]) => ({ logbookId: id, userId, role })),
          ['logbookId', 'userId'],
        );
      }
    });
    // Answer with the result even if this change took the person's own access away (handing the
    // logbook over and leaving it): their role is then none, and nothing is allowed.
    return toLogbookDto((await this.findWithPeople(id))!, this.casl.createForUser(user), user.id);
  }

  async remove(user: JwtUser, id: string): Promise<void> {
    await this.requireAccess(user, id, 'delete');
    // Entries, versions and pins go with it (ON DELETE CASCADE).
    await this.dataSource.getRepository(Logbook).delete({ id });
  }

  private findWithPeople(id: string): Promise<Logbook | null> {
    return this.dataSource.getRepository(Logbook).findOne({
      where: { id },
      relations: { owner: true, members: { user: true } },
    });
  }

  /**
   * The logbook with its members, when the person may do `action` with it. A logbook they cannot see
   * is "not found" (its existence is not revealed); one they can see but not change is "forbidden".
   */
  async requireAccess(
    user: JwtUser,
    id: string,
    action: Exclude<Action, 'create'>,
  ): Promise<Logbook> {
    const logbook = await this.findWithPeople(id);
    const ability = this.casl.createForUser(user);
    if (!logbook || !ability.can('read', logbookSubject(logbook))) {
      throw new NotFoundException('Logbook not found.');
    }
    if (!ability.can(action, logbookSubject(logbook))) {
      throw new ForbiddenException(DENIED[action]);
    }
    return logbook;
  }
}
