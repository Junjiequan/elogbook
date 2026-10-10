import { existsSync } from 'node:fs';
import { DataSource } from 'typeorm';
import { hashPassword } from '../auth/utils/password.js';
import { User } from '../users/entities/user.entity.js';
import { dataSourceOptions } from './database.config.js';

/**
 * Development helper: the three demo accounts of the Angular app's test sign-in, so the same people can
 * sign in against the API. Run with `npm run seed -w backend` (after `npm run build`).
 * Refuses to run in production: these accounts share a published password.
 */
const DEMO_PASSWORD = 'demo1234';
const DEMO_USERS = [
  { name: 'Anna Lindqvist', email: 'anna.lindqvist@example.org' },
  { name: 'Jon Carter', email: 'jon.carter@example.org' },
  { name: 'Mei Tanaka', email: 'mei.tanaka@example.org' },
];

if (process.env.NODE_ENV === 'production') {
  throw new Error('Refusing to create demo accounts with a public password in production.');
}
if (existsSync('.env')) {
  process.loadEnvFile('.env');
}
const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error('DATABASE_URL is not set (see .env.example).');
}

const dataSource = await new DataSource(dataSourceOptions(url, true)).initialize();
const passwordHash = await hashPassword(DEMO_PASSWORD);
for (const person of DEMO_USERS) {
  await dataSource
    .createQueryBuilder()
    .insert()
    .into(User)
    .values({ ...person, passwordHash, invited: false, roles: [] })
    .orIgnore() // an account that exists is left as it is
    .execute();
}
await dataSource.destroy();
console.log(
  `Demo accounts ready (password "${DEMO_PASSWORD}"): ${DEMO_USERS.map((u) => u.email).join(', ')}`,
);
