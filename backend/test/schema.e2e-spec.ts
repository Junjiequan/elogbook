import type { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { createTestApp } from './helpers.js';

describe('database schema', () => {
  let app: INestApplication;
  beforeAll(async () => {
    app = await createTestApp();
  });
  afterAll(() => app.close());

  it('is exactly what the entities describe, once the migrations have run', async () => {
    const pending = await app.get(DataSource).driver.createSchemaBuilder().log();

    // If this fails, a column or index changed in an entity without a migration to match.
    expect(pending.upQueries.map((q) => q.query)).toEqual([]);
  });

  it('rejects a role, visibility or version reason the API would never write', async () => {
    const db = app.get(DataSource);
    const [{ id }] = await db.query(
      "INSERT INTO users (email, name) VALUES ('schema-check@example.org', 'Schema check') RETURNING id",
    );
    try {
      await expect(
        db.query("INSERT INTO logbooks (title, visibility, owner_id) VALUES ('x', 'public', $1)", [
          id,
        ]),
      ).rejects.toThrow(/CHK_logbooks_visibility/);
    } finally {
      await db.query('DELETE FROM users WHERE id = $1', [id]);
    }
  });

  it('does not allow a logbook without an owner', async () => {
    await expect(
      app.get(DataSource).query("INSERT INTO logbooks (title) VALUES ('nobody owns this')"),
    ).rejects.toThrow(/owner_id/);
  });
});
