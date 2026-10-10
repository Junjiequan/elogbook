import pg from 'pg';
import { createDemoLogbooks } from '../src/content/demo-set.js';
import { listPeople, type Person, removeFor, seedFor } from '../src/seed.js';

describe('seeding dummy logbooks', () => {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  /** How many logbooks one person is given: whatever the dummy content contains. */
  const perPerson = createDemoLogbooks(
    { id: 'x', name: 'X', email: 'x@example.org' },
    new Date(),
  ).length;

  const count = async (sql: string, ...params: unknown[]) =>
    Number(
      (await client.query<{ n: string }>(`SELECT count(*) AS n FROM ${sql}`, params)).rows[0].n,
    );
  const addPerson = async (email: string, name: string, invited = false): Promise<Person> =>
    (
      await client.query<Person>(
        `INSERT INTO users (email, name, password_hash, invited) VALUES ($1, $2, 'scrypt$x$y', $3) RETURNING id, name, email`,
        [email, name, invited],
      )
    ).rows[0];

  beforeAll(async () => {
    await client.connect();
    const { rows } = await client.query("SELECT to_regclass('public.logbooks') AS found");
    if (!rows[0].found) {
      throw new Error(
        'The tables do not exist: run the backend e2e tests first (npm run test:e2e does).',
      );
    }
  });
  beforeEach(() =>
    client.query(
      'TRUNCATE users, logbooks, logbook_members, entries, entry_versions, pinned_entries CASCADE',
    ),
  );
  afterAll(() => client.end());

  it('lists the people who can sign in, not those who were only invited', async () => {
    await addPerson('anna@example.org', 'Anna');
    await addPerson('jon@example.org', 'Jon');
    await addPerson('invited@example.org', 'Invited', true);

    expect((await listPeople(client)).map((p) => p.email)).toEqual([
      'anna@example.org',
      'jon@example.org',
    ]);
    expect((await listPeople(client, ['JON@example.org'])).map((p) => p.email)).toEqual([
      'jon@example.org',
    ]);
  });

  it('gives a person all the dummy logbooks, with entries, version history and pins', async () => {
    const anna = await addPerson('anna@example.org', 'Anna');

    const result = await seedFor(client, anna);

    expect(result).toEqual({ created: perPerson, total: perPerson });
    expect(await count('logbooks')).toBe(perPerson);
    expect(await count('entries')).toBeGreaterThan(perPerson);
    expect(await count('entry_versions')).toBeGreaterThan(0);
    const pins = await client.query(
      'SELECT e.title FROM pinned_entries p JOIN entries e ON e.id = p.entry_id ORDER BY p.position',
    );
    expect(pins.rows.map((r) => r.title)).toEqual([
      'Handover checklist and data management',
      'Shear cell commissioning – leak at upper seal',
      'Pristine vs 500 cycles – first look',
    ]);
  });

  it('puts the person in every logbook, with an owner who is also an owner member', async () => {
    const anna = await addPerson('anna@example.org', 'Anna');
    await seedFor(client, anna);

    expect(await count('logbook_members WHERE user_id = $1', anna.id)).toBe(perPerson);
    expect(
      await count(
        'logbooks l WHERE NOT EXISTS (SELECT 1 FROM logbook_members m WHERE m.logbook_id = l.id AND m.user_id = l.owner_id AND m.role = $1)',
        'owner',
      ),
    ).toBe(0);
  });

  it('keeps every dummy logbook private, so it can never show up in someone else’s list', async () => {
    const content = createDemoLogbooks({ id: 'x', name: 'X', email: 'x@example.org' }, new Date());
    expect(content.some((b) => b.logbook.visibility === 'facility-read')).toBe(true); // the rule is worth testing

    await seedFor(client, await addPerson('anna@example.org', 'Anna'));

    expect(await count("logbooks WHERE visibility <> 'private'")).toBe(0);
  });

  it('makes private again a dummy logbook an earlier version left open to the facility', async () => {
    const anna = await addPerson('anna@example.org', 'Anna');
    await seedFor(client, anna);
    await client.query("UPDATE logbooks SET visibility = 'facility-read'");
    const real = (
      await client.query(
        "INSERT INTO logbooks (title, owner_id, visibility) VALUES ('Open on purpose', $1, 'facility-read') RETURNING id",
        [anna.id],
      )
    ).rows[0].id;

    await seedFor(client, anna);

    expect(await count("logbooks WHERE visibility <> 'private'")).toBe(1);
    expect(await count("logbooks WHERE id = $1 AND visibility = 'facility-read'", real)).toBe(1);
  });

  it('makes the fictional colleagues as invited accounts, who cannot sign in', async () => {
    await seedFor(client, await addPerson('anna@example.org', 'Anna'));

    expect(await count('users WHERE invited = true')).toBeGreaterThan(5);
    expect(await count('users WHERE invited = true AND password_hash IS NOT NULL')).toBe(0);
  });

  it('can be repeated: nothing is made twice', async () => {
    const anna = await addPerson('anna@example.org', 'Anna');
    await seedFor(client, anna);
    const before = {
      logbooks: await count('logbooks'),
      entries: await count('entries'),
      users: await count('users'),
    };

    expect((await seedFor(client, anna)).created).toBe(0);

    expect({
      logbooks: await count('logbooks'),
      entries: await count('entries'),
      users: await count('users'),
    }).toEqual(before);
  });

  it('is personal: each person has their own set, and nobody is in another’s', async () => {
    const anna = await addPerson('anna@example.org', 'Anna');
    const jon = await addPerson('jon@example.org', 'Jon');
    await seedFor(client, anna);
    await seedFor(client, jon);

    expect(await count('logbooks')).toBe(2 * perPerson);
    expect(await count('logbook_members WHERE user_id = $1', anna.id)).toBe(perPerson);
    expect(await count('logbook_members WHERE user_id = $1', jon.id)).toBe(perPerson);
    expect(
      await count(
        'logbook_members a JOIN logbook_members b ON a.logbook_id = b.logbook_id AND a.user_id = $1 AND b.user_id = $2',
        anna.id,
        jon.id,
      ),
    ).toBe(0);
  });

  it('leaves the pins of someone who already has some', async () => {
    const anna = await addPerson('anna@example.org', 'Anna');
    const mine = (
      await client.query(
        "INSERT INTO logbooks (title, owner_id) VALUES ('Mine', $1) RETURNING id",
        [anna.id],
      )
    ).rows[0].id;
    const entry = (
      await client.query(
        "INSERT INTO entries (logbook_id, title, content, updated_by_id) VALUES ($1, 'Mine', '{}', $2) RETURNING id",
        [mine, anna.id],
      )
    ).rows[0].id;
    await client.query(
      'INSERT INTO pinned_entries (user_id, entry_id, position) VALUES ($1, $2, 0)',
      [anna.id, entry],
    );

    await seedFor(client, anna);

    expect(
      (await client.query('SELECT entry_id FROM pinned_entries')).rows.map((r) => r.entry_id),
    ).toEqual([entry]);
  });

  it('removes exactly the dummy logbooks of that person, with everything in them', async () => {
    const anna = await addPerson('anna@example.org', 'Anna');
    const jon = await addPerson('jon@example.org', 'Jon');
    await seedFor(client, anna);
    await seedFor(client, jon);
    const real = (
      await client.query(
        "INSERT INTO logbooks (title, owner_id) VALUES ('A real logbook', $1) RETURNING id",
        [anna.id],
      )
    ).rows[0].id;
    await client.query(
      "INSERT INTO logbook_members (logbook_id, user_id, role) VALUES ($1, $2, 'owner')",
      [real, anna.id],
    );

    expect(await removeFor(client, anna)).toBe(perPerson);

    expect(await count('logbooks')).toBe(perPerson + 1); // Jon's set, and the real one
    expect(await count('logbooks WHERE id = $1', real)).toBe(1);
    expect(await count('logbook_members WHERE user_id = $1', anna.id)).toBe(1);
    expect(await count('pinned_entries WHERE user_id = $1', anna.id)).toBe(0);
    expect(await count('pinned_entries WHERE user_id = $1', jon.id)).toBeGreaterThan(0);
  });

  it('can be seeded again after being removed', async () => {
    const anna = await addPerson('anna@example.org', 'Anna');
    await seedFor(client, anna);
    await removeFor(client, anna);

    expect((await seedFor(client, anna)).created).toBe(perPerson);
  });
});
