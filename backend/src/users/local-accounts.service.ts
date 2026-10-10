import { existsSync, readFileSync } from 'node:fs';
import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { hashPassword, verifyPassword } from '../auth/utils/password.js';
import type { AppConfig } from '../config/configuration.js';
import { type LocalAccount, parseLocalAccounts } from './local-accounts.js';
import { UsersService } from './users.service.js';

export interface LocalAccountsResult {
  created: number;
  updated: number;
  unchanged: number;
}

/**
 * Makes the accounts of the local accounts file exist when the API starts: the way a facility gets its
 * first administrators without anyone signing up for them (SciCat's `functionalAccounts.json`).
 * The file is the truth for what it lists: names, roles and passwords are brought in line with it every
 * time, so changing a password or taking away `admin` is an edit of the file and a restart.
 */
@Injectable()
export class LocalAccountsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(LocalAccountsService.name);

  constructor(
    private readonly users: UsersService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const { file, explicit } = this.config.get('localAccounts', { infer: true });
    if (!existsSync(file)) {
      if (explicit) {
        throw new Error(`LOCAL_ACCOUNTS_FILE is set to ${file}, which does not exist.`);
      }
      return; // no file, no local accounts: people sign up, or ADMIN_EMAILS names administrators
    }
    const result = await this.syncFrom(file);
    this.logger.log(
      `Local accounts from ${file}: ${result.created} created, ${result.updated} updated, ${result.unchanged} unchanged.`,
    );
  }

  async syncFrom(file: string): Promise<LocalAccountsResult> {
    let json: unknown;
    try {
      json = JSON.parse(readFileSync(file, 'utf8'));
    } catch (error) {
      throw new Error(
        `The local accounts file ${file} cannot be read as JSON: ${(error as Error).message}`,
      );
    }
    const accounts = parseLocalAccounts(json, {
      production: this.config.get('environment', { infer: true }) === 'production',
    });

    const result: LocalAccountsResult = { created: 0, updated: 0, unchanged: 0 };
    for (const account of accounts) {
      result[await this.apply(account)] += 1;
    }
    return result;
  }

  private async apply(account: LocalAccount): Promise<keyof LocalAccountsResult> {
    const existing = await this.users.findForLogin(account.email);
    return this.users.applyAccount({
      email: account.email,
      name: account.name,
      roles: account.roles,
      passwordHash:
        account.passwordHash ?? (await this.hashFor(account.password!, existing?.passwordHash)),
    });
  }

  /** The hash to store: the one already there when the password has not changed (hashing is slow, and salted). */
  private async hashFor(password: string, current: string | null | undefined): Promise<string> {
    return current && (await verifyPassword(password, current)) ? current : hashPassword(password);
  }
}
