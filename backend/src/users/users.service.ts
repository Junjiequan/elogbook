import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { type EntityManager, QueryFailedError, Repository } from 'typeorm';
import { UserIdentity } from './entities/user-identity.entity.js';
import { User } from './entities/user.entity.js';

export const normaliseEmail = (email: string): string => email.trim().toLowerCase();

const UNIQUE_VIOLATION = '23505';

/** The account is already linked to a different person at this provider. */
export class IdentityConflictError extends Error {}

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
   * The account for a person a provider has vouched for. They are known by the provider's stable id, not their
   * email: a returning person is found by it, a first-time one is matched to an existing or invited account by
   * email (and linked), or gets a new account when `create` is set. `null`: no account and none to be made.
   * Throws `IdentityConflictError` if that account is already linked to somebody else at the same provider.
   */
  async signInWithIdentity(
    identity: { issuer: string; subject: string; email: string; name: string },
    create: boolean,
  ): Promise<User | null> {
    const attempt = () =>
      this.users.manager.transaction(async (manager) => {
        const linked = await manager.findOneBy(UserIdentity, {
          issuer: identity.issuer,
          subject: identity.subject,
        });
        if (linked) {
          return manager.findOneByOrFail(User, { id: linked.userId });
        }
        const key = normaliseEmail(identity.email);
        const existing = await manager
          .createQueryBuilder(User, 'user')
          .setLock('pessimistic_write')
          .where('user.email = :email', { email: key })
          .getOne();
        if (!existing && !create) {
          return null;
        }
        if (
          existing &&
          (await manager.existsBy(UserIdentity, { userId: existing.id, issuer: identity.issuer }))
        ) {
          throw new IdentityConflictError();
        }
        const user =
          existing ?? manager.create(User, { email: key, roles: [], passwordHash: null });
        if (!existing || existing.invited) {
          user.name = identity.name.trim() || key.split('@')[0];
          user.invited = false;
        }
        const saved = await manager.save(user);
        await manager.insert(UserIdentity, {
          issuer: identity.issuer,
          subject: identity.subject,
          userId: saved.id,
        });
        return saved;
      });
    try {
      return await attempt();
    } catch (error) {
      if (error instanceof QueryFailedError && error.driverError?.code === UNIQUE_VIOLATION) {
        return attempt(); // two first sign-ins at once
      }
      throw error;
    }
  }

  /**
   * Makes an account exist exactly as given (the local accounts file): created if new, otherwise brought in
   * line, including an account that was only invited or that someone registered first.
   */
  async applyAccount(account: {
    email: string;
    name: string;
    roles: string[];
    passwordHash: string;
  }): Promise<'created' | 'updated' | 'unchanged'> {
    const existing = await this.findForLogin(account.email);
    if (!existing) {
      await this.users.save(
        this.users.create({ ...account, email: normaliseEmail(account.email), invited: false }),
      );
      return 'created';
    }
    const same =
      existing.name === account.name &&
      existing.passwordHash === account.passwordHash &&
      !existing.invited &&
      [...existing.roles].sort().join() === [...account.roles].sort().join();
    if (same) {
      return 'unchanged';
    }
    Object.assign(existing, { ...account, email: existing.email, invited: false });
    await this.users.save(existing);
    return 'updated';
  }

  /**
   * The accounts for these emails, creating an invited one (no password yet) for anybody new: sharing
   * a logbook with a colleague must work before they have signed in for the first time.
   */
  async ensureByEmails(emails: string[], manager: EntityManager): Promise<Map<string, User>> {
    const keys = [...new Set(emails.map(normaliseEmail))];
    await manager
      .createQueryBuilder()
      .insert()
      .into(User)
      .values(
        keys.map((email) => ({
          email,
          name: email.split('@')[0],
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
