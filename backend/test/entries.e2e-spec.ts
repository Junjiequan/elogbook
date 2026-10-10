import type { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { createTestApp, type Person, resetDatabase, signUp } from './helpers.js';

const doc = (text: string) => ({
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
});

describe('entries', () => {
  let app: INestApplication;
  let anna: Person;
  let jon: Person;
  let mei: Person;
  let logbookId: string;

  beforeAll(async () => {
    app = await createTestApp();
  });
  beforeEach(async () => {
    await resetDatabase(app);
    anna = await signUp(app, 'Anna Lindqvist', 'anna@example.org');
    jon = await signUp(app, 'Jon Carter', 'jon@example.org');
    mei = await signUp(app, 'Mei Tanaka', 'mei@example.org');
    logbookId = await anna.createLogbook();
    await anna.share(logbookId, [
      { person: jon, role: 'editor' },
      { person: mei, role: 'viewer' },
    ]);
  });
  afterAll(() => app.close());

  it('creates an empty entry, newest first in the list', async () => {
    const first = await anna.createEntry(logbookId);
    const second = await jon.createEntry(logbookId);

    const res = await anna.get(`/logbooks/${logbookId}/entries`).expect(200);

    expect(res.body.map((e: any) => e.id)).toEqual([second.id, first.id]);
    expect(res.body[1]).toMatchObject({
      title: '',
      revision: 1,
      logbookId,
      updatedBy: anna.user,
      content: { type: 'doc' },
    });
  });

  it('saves changes, counts the revision and records who saved', async () => {
    const entry = await anna.createEntry(logbookId);

    const res = await jon
      .patch(`/entries/${entry.id}`, { revision: 1, title: 'Run 12', content: doc('Hello') })
      .expect(200);

    expect(res.body).toMatchObject({
      id: entry.id,
      title: 'Run 12',
      revision: 2,
      updatedBy: jon.user,
      content: doc('Hello'),
    });
  });

  it('leaves the other field alone when only one is sent', async () => {
    const entry = await anna.createEntry(logbookId);
    await anna.patch(`/entries/${entry.id}`, { revision: 1, title: 'Title', content: doc('Body') });

    const res = await anna
      .patch(`/entries/${entry.id}`, { revision: 2, title: 'New title' })
      .expect(200);

    expect(res.body).toMatchObject({ title: 'New title', content: doc('Body'), revision: 3 });
  });

  it('refuses a save based on an old revision, and says which revision is current', async () => {
    const entry = await anna.createEntry(logbookId);
    await jon.patch(`/entries/${entry.id}`, { revision: 1, title: 'Jon was first' }).expect(200);

    const res = await anna
      .patch(`/entries/${entry.id}`, { revision: 1, title: 'Anna overwrites' })
      .expect(409);

    expect(res.body.currentRevision).toBe(2);
    expect((await anna.get(`/entries/${entry.id}`).expect(200)).body.title).toBe('Jon was first');
  });

  it('lets exactly one of two simultaneous saves win', async () => {
    const entry = await anna.createEntry(logbookId);

    const results = await Promise.all([
      anna.patch(`/entries/${entry.id}`, { revision: 1, title: 'A' }),
      jon.patch(`/entries/${entry.id}`, { revision: 1, title: 'B' }),
    ]);

    expect(results.map((r) => r.status).sort((a, b) => a - b)).toEqual([200, 409]);
  });

  it('requires the revision', async () => {
    const entry = await anna.createEntry(logbookId);
    await anna.patch(`/entries/${entry.id}`, { title: 'No revision' }).expect(400);
  });

  it('lets viewers read but not write', async () => {
    const entry = await anna.createEntry(logbookId);

    await mei.get(`/entries/${entry.id}`).expect(200);
    await mei.post(`/logbooks/${logbookId}/entries`).expect(403);
    await mei.patch(`/entries/${entry.id}`, { revision: 1, title: 'x' }).expect(403);
    await mei.post(`/entries/${entry.id}/versions`).expect(403);
  });

  it('keeps strangers out entirely', async () => {
    const outsider = await signUp(app, 'Outsider', 'outsider@example.org');
    const entry = await anna.createEntry(logbookId);

    await outsider.get(`/entries/${entry.id}`).expect(404);
    await outsider.get(`/logbooks/${logbookId}/entries`).expect(404);
    await outsider.patch(`/entries/${entry.id}`, { revision: 1, title: 'x' }).expect(404);
  });

  it('lets an owner delete an entry, but not an editor', async () => {
    const entry = await anna.createEntry(logbookId);

    await jon.delete(`/entries/${entry.id}`).expect(403);
    await anna.delete(`/entries/${entry.id}`).expect(204);
    await anna.get(`/entries/${entry.id}`).expect(404);
  });

  describe('version history', () => {
    it('keeps a first automatic version, then waits before taking another', async () => {
      const entry = await anna.createEntry(logbookId);
      await anna.patch(`/entries/${entry.id}`, { revision: 1, title: 'One', content: doc('1') });
      await anna.patch(`/entries/${entry.id}`, { revision: 2, title: 'Two', content: doc('2') });

      const versions = (await anna.get(`/entries/${entry.id}/versions`).expect(200)).body;

      expect(versions).toHaveLength(1);
      expect(versions[0]).toMatchObject({ reason: 'auto', title: 'One', savedBy: anna.user });
    });

    it('takes another automatic version once the last is old enough', async () => {
      const entry = await anna.createEntry(logbookId);
      await anna.patch(`/entries/${entry.id}`, { revision: 1, title: 'One', content: doc('1') });
      await app
        .get(DataSource)
        .query("UPDATE entry_versions SET saved_at = now() - interval '10 minutes'");

      await anna.patch(`/entries/${entry.id}`, { revision: 2, title: 'Two', content: doc('2') });

      const versions = (await anna.get(`/entries/${entry.id}/versions`).expect(200)).body;
      expect(versions.map((v: any) => v.title)).toEqual(['Two', 'One']);
    });

    it('keeps a manual version at any time, by anyone who can write', async () => {
      const entry = await anna.createEntry(logbookId);
      await jon.patch(`/entries/${entry.id}`, { revision: 1, title: 'Draft', content: doc('d') });

      const res = await jon.post(`/entries/${entry.id}/versions`).expect(201);

      expect(res.body).toMatchObject({ reason: 'manual', title: 'Draft', savedBy: jon.user });
      expect((await mei.get(`/entries/${entry.id}/versions`).expect(200)).body).toHaveLength(2);
    });

    it('restores an old version, keeping what it replaces so the restore can be undone', async () => {
      const entry = await anna.createEntry(logbookId);
      await anna.patch(`/entries/${entry.id}`, {
        revision: 1,
        title: 'Good',
        content: doc('good'),
      });
      const keep = (await anna.post(`/entries/${entry.id}/versions`).expect(201)).body;
      await anna.patch(`/entries/${entry.id}`, {
        revision: 2,
        title: 'Broken',
        content: doc('broken'),
      });

      const restored = await jon
        .post(`/entries/${entry.id}/versions/${keep.id}/restore`)
        .expect(200);

      expect(restored.body).toMatchObject({
        title: 'Good',
        content: doc('good'),
        revision: 4,
        updatedBy: jon.user,
      });
      const versions = (await anna.get(`/entries/${entry.id}/versions`).expect(200)).body;
      const replaced = versions.find((v: any) => v.reason === 'restore');
      expect(replaced).toMatchObject({
        title: 'Broken',
        content: doc('broken'),
        savedBy: jon.user,
      });
    });

    it('does not restore a version of another entry', async () => {
      const a = await anna.createEntry(logbookId);
      const b = await anna.createEntry(logbookId);
      const version = (await anna.post(`/entries/${a.id}/versions`).expect(201)).body;

      await anna.post(`/entries/${b.id}/versions/${version.id}/restore`).expect(404);
    });
  });
});
