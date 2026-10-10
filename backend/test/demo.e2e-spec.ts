import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { createTestApp, type Person, resetDatabase, signUp } from './helpers.js';

describe('demo content', () => {
  let app: INestApplication;
  let anna: Person;
  let jon: Person;

  const listed = async (person: Person) => (await person.get('/logbooks').expect(200)).body;
  const count = (table: string) =>
    app
      .get(DataSource)
      .query(`SELECT count(*)::int AS n FROM ${table}`)
      .then((rows: { n: number }[]) => rows[0].n);

  beforeAll(async () => {
    app = await createTestApp();
  });
  beforeEach(async () => {
    await resetDatabase(app);
    anna = await signUp(app, 'Anna Lindqvist', 'anna@example.org');
    jon = await signUp(app, 'Jon Carter', 'jon@example.org');
  });
  afterAll(() => app.close());

  it('makes sample logbooks with entries, version history and pins', async () => {
    expect((await anna.get('/demo').expect(200)).body).toEqual({ logbooks: 0 });

    const res = await anna.post('/demo').expect(200);

    expect(res.body.created).toBe(res.body.total);
    const logbooks = await listed(anna);
    expect(logbooks).toHaveLength(res.body.total);
    expect(logbooks.every((l: any) => l.demo === true)).toBe(true);
    expect((await anna.get('/demo').expect(200)).body).toEqual({ logbooks: res.body.total });
    expect(await count('entries')).toBeGreaterThan(res.body.total);
    expect(await count('entry_versions')).toBeGreaterThan(0);

    const pins = (await anna.get('/pins').expect(200)).body;
    expect(pins.map((p: any) => p.entryTitle)).toEqual([
      'Handover checklist and data management',
      'Shear cell commissioning – leak at upper seal',
      'Pristine vs 500 cycles – first look',
    ]);
  });

  it('gives every sample logbook an owner, who is also an owner member', async () => {
    await anna.post('/demo').expect(200);

    for (const logbook of await listed(anna)) {
      expect(logbook.owner, logbook.title).toBeTruthy();
      expect(logbook.members, logbook.title).toContainEqual({ user: logbook.owner, role: 'owner' });
    }
  });

  it('gives the person the roles and capabilities the content describes', async () => {
    await anna.post('/demo').expect(200);
    const logbooks = await listed(anna);

    const owner = logbooks.find((l: any) => l.myRole === 'owner');
    const editor = logbooks.find((l: any) => l.myRole === 'editor');
    const viewer = logbooks.find((l: any) => l.myRole === 'viewer');
    expect(owner).toMatchObject({ canWrite: true, canConfigure: true, canDelete: true });
    expect(editor).toMatchObject({ canWrite: true, canConfigure: false, canDelete: false });
    expect(viewer).toMatchObject({ canWrite: false, canConfigure: false, canDelete: false });
    expect(owner.members.length).toBeGreaterThan(1);
  });

  it('can be repeated without duplicating anything, and keeps the person’s own edits', async () => {
    await anna.post('/demo').expect(200);
    const before = await listed(anna);
    const mine = before.find((l: any) => l.myRole === 'owner');
    await anna.patch(`/logbooks/${mine.id}`, { title: 'My own title' }).expect(200);
    const entriesBefore = await count('entries');

    const again = await anna.post('/demo').expect(200);

    expect(again.body.created).toBe(0);
    expect(await listed(anna)).toHaveLength(before.length);
    expect(await count('entries')).toBe(entriesBefore);
    expect((await anna.get(`/logbooks/${mine.id}`).expect(200)).body.title).toBe('My own title');
  });

  it('is personal: nobody else sees it, and removing it touches nobody else’s', async () => {
    await anna.post('/demo').expect(200);
    await jon.post('/demo').expect(200);
    const annasIds = (await listed(anna)).map((l: any) => l.id);
    const jonsIds = (await listed(jon)).map((l: any) => l.id);

    expect(annasIds.filter((id: string) => jonsIds.includes(id))).toEqual([]);

    await anna.delete('/demo').expect(204);

    expect(await listed(anna)).toEqual([]);
    expect((await listed(jon)).map((l: any) => l.id).sort()).toEqual(jonsIds.sort());
  });

  it('removes only the sample logbooks, with their entries, versions and pins', async () => {
    const real = await anna.createLogbook('My real logbook');
    const realEntry = await anna.createEntry(real);
    await anna.post('/demo').expect(200);

    await anna.delete('/demo').expect(204);

    const left = await listed(anna);
    expect(left.map((l: any) => l.id)).toEqual([real]);
    await anna.get(`/entries/${realEntry.id}`).expect(200);
    expect(await count('entries')).toBe(1);
    expect(await count('entry_versions')).toBe(0);
    expect(await count('pinned_entries')).toBe(0);
    expect((await anna.get('/demo').expect(200)).body).toEqual({ logbooks: 0 });
  });

  it('can be made again after it was removed, and pins again', async () => {
    await anna.post('/demo').expect(200);
    await anna.delete('/demo').expect(204);

    const res = await anna.post('/demo').expect(200);

    expect(res.body.created).toBe(res.body.total);
    expect((await anna.get('/pins').expect(200)).body).toHaveLength(3);
  });

  it('leaves the pins of someone who already has some', async () => {
    const real = await anna.createLogbook('Real');
    const entry = await anna.createEntry(real);
    await anna.put(`/pins/${entry.id}`).expect(204);

    await anna.post('/demo').expect(200);

    expect((await anna.get('/pins').expect(200)).body.map((p: any) => p.entryId)).toEqual([
      entry.id,
    ]);
  });

  it('does not let a sample logbook be seen by the facility, even if opened to it', async () => {
    await anna.post('/demo').expect(200);
    const owner = (await listed(anna)).find((l: any) => l.myRole === 'owner');

    await anna.patch(`/logbooks/${owner.id}`, { visibility: 'facility-read' }).expect(200);

    await jon.get(`/logbooks/${owner.id}`).expect(404);
    expect(await listed(jon)).toEqual([]);
  });

  it('answers 404 everywhere when it is switched off', async () => {
    const config = app.get(ConfigService);
    config.set('demo.enabled', false);
    try {
      await anna.get('/demo').expect(404);
      await anna.post('/demo').expect(404);
      await anna.delete('/demo').expect(404);
    } finally {
      config.set('demo.enabled', true);
    }
  });
});
