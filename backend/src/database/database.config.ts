import type { DataSourceOptions } from 'typeorm';
import { EntryVersion } from '../entries/entities/entry-version.entity.js';
import { Entry } from '../entries/entities/entry.entity.js';
import { LogbookMember } from '../logbooks/entities/logbook-member.entity.js';
import { Logbook } from '../logbooks/entities/logbook.entity.js';
import { PinnedEntry } from '../pins/entities/pinned-entry.entity.js';
import { User } from '../users/entities/user.entity.js';
import { InitialSchema1760000000000 } from './migrations/1760000000000-initial-schema.js';
import { DemoLogbooks1760000000001 } from './migrations/1760000000001-demo-logbooks.js';
import { LogbookOwner1760000000002 } from './migrations/1760000000002-logbook-owner.js';
import { SnakeNamingStrategy } from './snake-naming.strategy.js';

export const ENTITIES = [User, Logbook, LogbookMember, Entry, EntryVersion, PinnedEntry];
export const MIGRATIONS = [
  InitialSchema1760000000000,
  DemoLogbooks1760000000001,
  LogbookOwner1760000000002,
];

/**
 * The tables are only ever changed by migrations (`synchronize` stays off: it would happily drop a
 * column holding someone's lab notes to make the tables match the code).
 */
export function dataSourceOptions(url: string, runMigrations: boolean): DataSourceOptions {
  return {
    type: 'postgres',
    url,
    entities: ENTITIES,
    migrations: MIGRATIONS,
    migrationsRun: runMigrations,
    synchronize: false,
    // gen_random_uuid() is built into PostgreSQL 13+: no extension to install (which needs superuser rights).
    uuidExtension: 'pgcrypto',
    installExtensions: false,
    namingStrategy: new SnakeNamingStrategy(),
  };
}
