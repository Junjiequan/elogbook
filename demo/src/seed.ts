import type { Client } from 'pg';
import { createDemoLogbooks } from './content/demo-set.js';
import type { LogbookBundle, User } from './content/demo.types.js';
import { stableUuid } from './content/stable-uuid.js';

/** A person who can sign in. */
export interface Person {
  id: string;
  name: string;
  email: string;
}

/** Entries pinned for someone who has pinned nothing, so the "Pinned entries" panel has something to show. */
export const PINNED_TITLES = [
  'Handover checklist and data management',
  'Shear cell commissioning',
  'Pristine vs 500 cycles',
];
const MAX_PINS = 4;

/** The people who can sign in (not those who were only invited), or only those with these emails. */
export async function listPeople(client: Client, emails?: string[]): Promise<Person[]> {
  const wanted = emails?.map((email) => email.trim().toLowerCase());
  const { rows } = await client.query<Person>(
    `SELECT id, name, email FROM users
     WHERE invited = false AND ($1::text[] IS NULL OR email = ANY($1))
     ORDER BY email`,
    [wanted ?? null],
  );
  return rows;
}

const asUser = (person: Person): User => ({
  id: person.id,
  name: person.name,
  email: person.email,
});

/**
 * Gives one person their dummy logbooks, entries, version history and pins. Safe to repeat: a logbook that
 * is already there is left as it is, only missing ones are added.
 *
 * Every dummy logbook is `private`, listing only that person and fictional colleagues (made as invited
 * accounts, who cannot sign in): a logbook "open to the facility" would show up in everyone's list.
 */
export async function seedFor(
  client: Client,
  person: Person,
): Promise<{ created: number; total: number }> {
  const me = asUser(person);
  const bundles = createDemoLogbooks(me, new Date());

  await client.query('BEGIN');
  try {
    const idOf = await ensureColleagues(client, bundles);
    let created = 0;
    for (const bundle of bundles) {
      const logbookId = stableUuid(`${me.id}:${bundle.logbook.id}`);
      const { rowCount } = await client.query('SELECT 1 FROM logbooks WHERE id = $1', [logbookId]);
      if (rowCount) {
        continue;
      }
      await insertBundle(client, bundle, logbookId, me, idOf);
      created += 1;
    }
    if (created > 0) {
      await pinDefaults(client, person.id);
    }
    // Dummy logbooks made by earlier versions of this tool could be open to the facility, which would show
    // one person's in everyone's list: make them private.
    await client.query(
      "UPDATE logbooks SET visibility = 'private' WHERE id = ANY($1::uuid[]) AND visibility <> 'private'",
      [bundles.map((bundle) => stableUuid(`${me.id}:${bundle.logbook.id}`))],
    );
    await client.query('COMMIT');
    return { created, total: bundles.length };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

/** Removes exactly the logbooks `seedFor` makes for this person (found by their ids), with everything in them. */
export async function removeFor(client: Client, person: Person): Promise<number> {
  const me = asUser(person);
  const ids = createDemoLogbooks(me, new Date()).map((bundle) =>
    stableUuid(`${me.id}:${bundle.logbook.id}`),
  );
  const { rowCount } = await client.query('DELETE FROM logbooks WHERE id = ANY($1::uuid[])', [ids]);
  return rowCount ?? 0;
}

/** The fictional colleagues in the content exist as invited accounts; returns their ids by email. */
async function ensureColleagues(
  client: Client,
  bundles: LogbookBundle[],
): Promise<(person: User) => string> {
  const all = bundles.flatMap(({ logbook, entries, versions }) => [
    ...logbook.members.map((m) => m.user),
    ...entries.map((e) => e.updatedBy),
    ...versions.map((v) => v.savedBy),
  ]);
  const people = [...new Map(all.map((p) => [p.email.toLowerCase(), p])).values()];
  for (const person of people) {
    await client.query(
      `INSERT INTO users (email, name, invited) VALUES ($1, $2, true) ON CONFLICT (email) DO NOTHING`,
      [person.email.toLowerCase(), person.name],
    );
  }
  const { rows } = await client.query<{ id: string; email: string }>(
    'SELECT id, email FROM users WHERE email = ANY($1::text[])',
    [people.map((p) => p.email.toLowerCase())],
  );
  const ids = new Map(rows.map((row) => [row.email, row.id]));
  return (person) => ids.get(person.email.toLowerCase())!;
}

async function insertBundle(
  client: Client,
  { logbook, entries, versions }: LogbookBundle,
  logbookId: string,
  me: User,
  idOf: (person: User) => string,
): Promise<void> {
  const entryId = (id: string) => stableUuid(`${me.id}:entry:${id}`);
  const owner = (logbook.members.find((m) => m.role === 'owner') ?? { user: me }).user;

  await client.query(
    `INSERT INTO logbooks (id, title, description, instrument, proposal_id, visibility, owner_id, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, 'private', $6, $7, $8)`,
    [
      logbookId,
      logbook.title,
      logbook.description,
      logbook.instrument,
      logbook.proposalId,
      idOf(owner),
      logbook.createdAt,
      logbook.updatedAt,
    ],
  );
  const members = new Map(logbook.members.map((m) => [idOf(m.user), m.role]));
  for (const [userId, role] of members) {
    await client.query(
      'INSERT INTO logbook_members (logbook_id, user_id, role) VALUES ($1, $2, $3)',
      [logbookId, userId, role],
    );
  }
  for (const entry of entries) {
    await client.query(
      `INSERT INTO entries (id, logbook_id, title, content, revision, created_at, updated_at, updated_by_id)
       VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8)`,
      [
        entryId(entry.id),
        logbookId,
        entry.title,
        JSON.stringify(entry.content),
        entry.revision,
        entry.createdAt,
        entry.updatedAt,
        idOf(entry.updatedBy),
      ],
    );
  }
  for (const version of versions) {
    await client.query(
      `INSERT INTO entry_versions (id, entry_id, title, content, saved_at, saved_by_id, reason)
       VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7)`,
      [
        stableUuid(`${me.id}:version:${version.id}`),
        entryId(version.entryId),
        version.title,
        JSON.stringify(version.content),
        version.savedAt,
        idOf(version.savedBy),
        version.reason,
      ],
    );
  }
}

/** Someone who has pinned nothing gets a few pins; anyone with pins of their own keeps only those. */
async function pinDefaults(client: Client, userId: string): Promise<void> {
  const { rowCount } = await client.query('SELECT 1 FROM pinned_entries WHERE user_id = $1', [
    userId,
  ]);
  if (rowCount) {
    return;
  }
  const { rows } = await client.query<{ id: string; title: string }>(
    `SELECT e.id, e.title FROM entries e
     JOIN logbook_members m ON m.logbook_id = e.logbook_id AND m.user_id = $1`,
    [userId],
  );
  const picked = PINNED_TITLES.flatMap((title) => {
    const found = rows.find((row) => row.title.startsWith(title));
    return found ? [found.id] : [];
  }).slice(0, MAX_PINS);
  for (const [position, entryId] of picked.entries()) {
    await client.query(
      'INSERT INTO pinned_entries (user_id, entry_id, position) VALUES ($1, $2, $3)',
      [userId, entryId, position],
    );
  }
}
