import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { type EntityManager, QueryFailedError, Repository } from 'typeorm';
import { User } from './entities/user.entity.js';

export const normaliseEmail = (email: string): string => email.trim().toLowerCase();

const UNIQUE_VIOLATION = '23505';

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private readonly users: Repository<User>) {}

  findById(id: string): Promise<User | null> {
    return this.users.findOneBy({ id });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.users.findOneBy({ email: normaliseEmail(email) });
  }

  /** The same as `findByEmail`, but with the password hash, which is normally never loaded. */
  findForLogin(email: string): Promise<User | null> {
    return this.users
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email: normaliseEmail(email) })
      .getOne();
  }

  /**
   * Creates an account. If the email was already shared with before the person signed up (an invited
   * account), registering claims it, so the logbooks shared with them are there at first sign-in.
   */
  async register(name: string, email: string, passwordHash: string): Promise<User> {
    const key = normaliseEmail(email);
    try {
      return await this.users.manager.transaction(async (manager) => {
        const existing = await manager
          .createQueryBuilder(User, 'user')
          .setLock('pessimistic_write')
          .where('user.email = :email', { email: key })
          .getOne();
        if (existing && !existing.invited) {
          throw new ConflictException('An account with this email already exists. Try signing in.');
        }
        const user = existing ?? manager.create(User, { email: key, roles: [] });
        user.name = name.trim();
        user.passwordHash = passwordHash;
        user.invited = false;
        return manager.save(user);
      });
    } catch (error) {
      if (error instanceof QueryFailedError && error.driverError?.code === UNIQUE_VIOLATION) {
        throw new ConflictException('An account with this email already exists. Try signing in.');
      }
      throw error;
    }
  }

  /**
   * The accounts for these emails, creating an invited one (no password yet) for anybody new: sharing
   * a logbook with a colleague must work before they have signed in for the first time.
   */
  async ensureByEmails(emails: string[], manager: EntityManager): Promise<Map<string, User>> {
    return this.ensurePeople(
      emails.map((email) => ({ email })),
      manager,
    );
  }

  /** The same, for people whose name is known (the colleagues in the sample logbooks). */
  async ensurePeople(
    people: { email: string; name?: string }[],
    manager: EntityManager,
  ): Promise<Map<string, User>> {
    const named = new Map(people.map((p) => [normaliseEmail(p.email), p.name]));
    const keys = [...named.keys()];
    await manager
      .createQueryBuilder()
      .insert()
      .into(User)
      .values(
        keys.map((email) => ({
          email,
          name: named.get(email) ?? email.split('@')[0],
          invited: true,
          roles: [],
        })),
      )
      .orIgnore()
      .execute();
    const found = await manager
      .createQueryBuilder(User, 'user')
      .where('user.email IN (:...keys)', { keys })
      .getMany();
    return new Map(found.map((user) => [user.email, user]));
  }
}
