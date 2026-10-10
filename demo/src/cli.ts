import pg from 'pg';
import { isDemoEnabled, NOT_ENABLED } from './enabled.js';
import { listPeople, removeFor, seedFor } from './seed.js';

const USAGE = `Usage:
  seed     [--users a@x.org,b@x.org]   give people their dummy logbooks (default: everyone who can sign in);
                                       only when ENABLE_DEMO=true
  remove   [--users a@x.org,b@x.org]   remove exactly those logbooks again (always allowed)

Settings: DATABASE_URL, and ENABLE_DEMO for seed. They are also read from backend/.env.`;

const [command, ...rest] = process.argv.slice(2);
const usersFlag = rest.indexOf('--users');
const emails = usersFlag >= 0 ? rest[usersFlag + 1]?.split(',').filter(Boolean) : undefined;

async function withDatabase<T>(work: (client: pg.Client) => Promise<T>): Promise<T> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set (it is read from backend/.env too).');
  }
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    return await work(client);
  } finally {
    await client.end();
  }
}

async function main(): Promise<void> {
  if (command === 'seed' && !isDemoEnabled(process.env)) {
    console.error(NOT_ENABLED);
    process.exitCode = 1;
  } else if (command === 'seed' || command === 'remove') {
    await withDatabase(async (client) => {
      const people = await listPeople(client, emails);
      if (people.length === 0) {
        console.log('Nobody to do this for yet: sign up first.');
      }
      for (const person of people) {
        if (command === 'seed') {
          const { created, total } = await seedFor(client, person);
          console.log(`${person.email}: ${created} of ${total} dummy logbooks made`);
        } else {
          console.log(`${person.email}: ${await removeFor(client, person)} dummy logbooks removed`);
        }
      }
    });
  } else {
    console.log(USAGE);
    process.exitCode = command ? 1 : 0;
  }
}

main().catch((error: unknown) => {
  console.error((error as Error).message);
  process.exitCode = 1;
});
