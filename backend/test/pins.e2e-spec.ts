import type { INestApplication } from '@nestjs/common';
import { createTestApp, type Person, resetDatabase, signUp } from './helpers.js';

describe('pins', () => {
  let app: INestApplication;
  let anna: Person;
  let jon: Person;
  let logbookId: string;

  const pinned = async (person: Person): Promise<string[]> =>
    (await person.get('/pins').expect(200)).body.map((p: any) => p.entryId);

  const entries = async (count: number): Promise<string[]> => {
    const ids: string[] = [];
    for (let i = 0; i < count; i++) {
      ids.push((await anna.createEntry(logbookId)).id);
    }
    return ids;
  };

  beforeAll(async () => {
    app = await createTestApp();
  });
  beforeEach(async () => {
    await resetDatabase(app);
    anna = await signUp(app, 'Anna Lindqvist', 'anna@example.org');
    jon = await signUp(app, 'Jon Carter', 'jon@example.org');
    logbookId = await anna.createLogbook('LoKI beamtime', { instrument: 'LoKI' });
  });
  afterAll(() => app.close());

  it('lists a pin with where the entry lives and who last changed it', async () => {
    const [id] = await entries(1);
    await anna.patch(`/entries/${id}`, { revision: 1, title: 'Handover' }).expect(200);
    await anna.put(`/pins/${id}`).expect(204);

    const res = await anna.get('/pins').expect(200);

    expect(res.body).toEqual([
      {
        entryId: id,
        entryTitle: 'Handover',
        logbookId,
        logbookTitle: 'LoKI beamtime',
        instrument: 'LoKI',
        pinnedAt: expect.any(String),
        updatedAt: expect.any(String),
        updatedBy: anna.user,
      },
    ]);
  });

  it('keeps pins in the order they were made, and pinning twice changes nothing', async () => {
    const [a, b, c] = await entries(3);
    for (const id of [b, a, c, b]) {
      await anna.put(`/pins/${id}`).expect(204);
    }

    expect(await pinned(anna)).toEqual([b, a, c]);
  });

  it('refuses a fifth pin, and says why', async () => {
    const ids = await entries(5);
    for (const id of ids.slice(0, 4)) {
      await anna.put(`/pins/${id}`).expect(204);
    }

    const res = await anna.put(`/pins/${ids[4]}`).expect(409);

    expect(res.body.code).toBe('PIN_LIMIT_REACHED');
    expect(await pinned(anna)).toHaveLength(4);
  });

  it('cannot be pushed over the limit by pins made at the same moment', async () => {
    const ids = await entries(8);

    await Promise.all(ids.map((id) => anna.put(`/pins/${id}`)));

    expect(await pinned(anna)).toHaveLength(4);
  });

  it('frees a place when an entry is unpinned', async () => {
    const ids = await entries(5);
    for (const id of ids.slice(0, 4)) {
      await anna.put(`/pins/${id}`);
    }

    await anna.delete(`/pins/${ids[0]}`).expect(204);
    await anna.put(`/pins/${ids[4]}`).expect(204);

    expect(await pinned(anna)).toEqual([ids[1], ids[2], ids[3], ids[4]]);
  });

  it('stores the order the person arranges', async () => {
    const [a, b, c] = await entries(3);
    for (const id of [a, b, c]) {
      await anna.put(`/pins/${id}`);
    }

    await anna.put('/pins/order', { entryIds: [c, a, b] }).expect(204);
    expect(await pinned(anna)).toEqual([c, a, b]);

    await anna.put('/pins/order', { entryIds: [b] }).expect(204); // the rest keep their order after it
    expect(await pinned(anna)).toEqual([b, c, a]);
  });

  it('keeps pins personal', async () => {
    await anna.share(logbookId, [{ person: jon, role: 'viewer' }]);
    const [id] = await entries(1);
    await anna.put(`/pins/${id}`).expect(204);

    expect(await pinned(jon)).toEqual([]);
    await jon.put(`/pins/${id}`).expect(204);
    await jon.delete(`/pins/${id}`).expect(204);
    expect(await pinned(anna)).toEqual([id]);
  });

  it('only lets a person pin an entry they can read', async () => {
    const [id] = await entries(1);
    await jon.put(`/pins/${id}`).expect(404);
  });

  it('leaves out a pin once the person can no longer read the entry', async () => {
    await anna.share(logbookId, [{ person: jon, role: 'viewer' }]);
    const [id] = await entries(1);
    await jon.put(`/pins/${id}`).expect(204);
    expect(await pinned(jon)).toEqual([id]);

    await anna.share(logbookId, []);

    expect(await pinned(jon)).toEqual([]);
  });

  it('drops the pin when the entry is deleted', async () => {
    const [id] = await entries(1);
    await anna.put(`/pins/${id}`);

    await anna.delete(`/entries/${id}`).expect(204);

    expect(await pinned(anna)).toEqual([]);
  });
});
