import type { INestApplication } from '@nestjs/common';
import { createTestApp, type Person, resetDatabase, signUp } from './helpers.js';

describe('logbooks', () => {
  let app: INestApplication;
  let anna: Person;
  let jon: Person;
  let mei: Person;
  let admin: Person;

  beforeAll(async () => {
    app = await createTestApp();
  });
  beforeEach(async () => {
    await resetDatabase(app);
    anna = await signUp(app, 'Anna Lindqvist', 'anna@example.org');
    jon = await signUp(app, 'Jon Carter', 'jon@example.org');
    mei = await signUp(app, 'Mei Tanaka', 'mei@example.org');
    admin = await signUp(app, 'Admin', 'admin@example.org');
  });
  afterAll(() => app.close());

  it('creates a private logbook owned by its creator', async () => {
    const res = await anna
      .post('/logbooks', {
        title: '  LoKI beamtime  ',
        instrument: 'LoKI',
        proposalId: '2026-0412',
      })
      .expect(201);

    expect(res.body).toMatchObject({
      title: 'LoKI beamtime', // trimmed
      description: '',
      instrument: 'LoKI',
      proposalId: '2026-0412',
      visibility: 'private',
      members: [{ user: anna.user, role: 'owner' }],
    });
    expect(res.body.createdAt).toEqual(expect.any(String));
  });

  it('says what the person asking may do with each logbook', async () => {
    const id = await anna.createLogbook();
    await anna.share(id, [
      { person: jon, role: 'editor' },
      { person: mei, role: 'viewer' },
    ]);
    await anna.patch(`/logbooks/${id}`, { visibility: 'facility-read' }).expect(200);

    const as = async (person: Person) => (await person.get(`/logbooks/${id}`).expect(200)).body;

    expect(await as(anna)).toMatchObject({
      myRole: 'owner',
      canWrite: true,
      canConfigure: true,
      canDelete: true,
    });
    expect(await as(jon)).toMatchObject({
      myRole: 'editor',
      canWrite: true,
      canConfigure: false,
      canDelete: false,
    });
    expect(await as(mei)).toMatchObject({
      myRole: 'viewer',
      canWrite: false,
      canConfigure: false,
      canDelete: false,
    });
    expect(await as(admin)).toMatchObject({
      myRole: 'viewer',
      canWrite: false,
      canConfigure: false,
      canDelete: true,
    });
  });

  it('refuses a logbook without a title', async () => {
    await anna.post('/logbooks', { title: '   ' }).expect(400);
    await anna.post('/logbooks', {}).expect(400);
  });

  it('shows each person only the logbooks they can open', async () => {
    const mine = await anna.createLogbook('Anna only');
    const shared = await anna.createLogbook('Shared with Jon');
    await anna.share(shared, [{ person: jon, role: 'viewer' }]);

    const annaSees = (await anna.get('/logbooks').expect(200)).body.map((l: any) => l.id);
    const jonSees = (await jon.get('/logbooks').expect(200)).body.map((l: any) => l.id);
    const meiSees = (await mei.get('/logbooks').expect(200)).body.map((l: any) => l.id);

    expect(annaSees.sort()).toEqual([mine, shared].sort());
    expect(jonSees).toEqual([shared]);
    expect(meiSees).toEqual([]);
  });

  it('hides a logbook from outsiders as if it did not exist', async () => {
    const id = await anna.createLogbook();
    await jon.get(`/logbooks/${id}`).expect(404);
    await jon.patch(`/logbooks/${id}`, { title: 'Mine now' }).expect(404);
    await jon.delete(`/logbooks/${id}`).expect(404);
  });

  it('lets everyone read a facility-read logbook, but not change it', async () => {
    const id = await anna.createLogbook();
    await anna.patch(`/logbooks/${id}`, { visibility: 'facility-read' }).expect(200);

    await mei.get(`/logbooks/${id}`).expect(200);
    expect((await mei.get('/logbooks').expect(200)).body.map((l: any) => l.id)).toContain(id);
    await mei.patch(`/logbooks/${id}`, { title: 'Hijack' }).expect(403);
    await mei.post(`/logbooks/${id}/entries`).expect(403);
  });

  it('lets only an owner change the settings', async () => {
    const id = await anna.createLogbook();
    await anna.share(id, [
      { person: jon, role: 'editor' },
      { person: mei, role: 'viewer' },
    ]);

    await jon.patch(`/logbooks/${id}`, { title: 'Edited by editor' }).expect(403);
    await mei.patch(`/logbooks/${id}`, { title: 'Edited by viewer' }).expect(403);
    const res = await anna
      .patch(`/logbooks/${id}`, { title: 'Renamed', description: 'New text' })
      .expect(200);
    expect(res.body).toMatchObject({ title: 'Renamed', description: 'New text' });
  });

  it('replaces the member list, and removing a person takes their access away', async () => {
    const id = await anna.createLogbook();
    await anna.share(id, [{ person: jon, role: 'editor' }]);
    await jon.get(`/logbooks/${id}`).expect(200);

    const res = await anna
      .patch(`/logbooks/${id}`, { members: [{ email: anna.email, role: 'owner' }] })
      .expect(200);

    expect(res.body.members).toEqual([{ user: anna.user, role: 'owner' }]);
    await jon.get(`/logbooks/${id}`).expect(404);
  });

  it('never leaves a logbook without an owner', async () => {
    const id = await anna.createLogbook();
    await anna
      .patch(`/logbooks/${id}`, { members: [{ email: jon.email, role: 'editor' }] })
      .expect(400);
    await anna.get(`/logbooks/${id}`).expect(200);
  });

  it('shares with someone who has not signed up yet, and they find it when they do', async () => {
    const id = await anna.createLogbook('For a new colleague');
    await anna
      .patch(`/logbooks/${id}`, {
        members: [
          { email: anna.email, role: 'owner' },
          { email: 'Newcomer@Example.org', role: 'editor' },
        ],
      })
      .expect(200);

    const newcomer = await signUp(app, 'New Comer', 'newcomer@example.org');

    const seen = (await newcomer.get('/logbooks').expect(200)).body;
    expect(seen.map((l: any) => l.id)).toEqual([id]);
    expect(seen[0].members.find((m: any) => m.role === 'editor').user.name).toBe('New Comer');
  });

  it('lets an owner delete, but not an editor, a viewer or an administrator who cannot open it', async () => {
    const id = await anna.createLogbook();
    await anna.share(id, [
      { person: jon, role: 'editor' },
      { person: mei, role: 'viewer' },
    ]);

    await jon.delete(`/logbooks/${id}`).expect(403);
    await mei.delete(`/logbooks/${id}`).expect(403);
    await admin.delete(`/logbooks/${id}`).expect(404); // may delete what they can open, not everything
    await anna.delete(`/logbooks/${id}`).expect(204);
    await anna.get(`/logbooks/${id}`).expect(404);
  });

  it('lets an administrator delete a facility-read logbook they can open', async () => {
    const id = await anna.createLogbook();
    await anna.patch(`/logbooks/${id}`, { visibility: 'facility-read' }).expect(200);
    await admin.delete(`/logbooks/${id}`).expect(204);
  });

  it('removes the entries, versions and pins with the logbook', async () => {
    const id = await anna.createLogbook();
    const entry = await anna.createEntry(id);
    await anna.put(`/pins/${entry.id}`).expect(204);

    await anna.delete(`/logbooks/${id}`).expect(204);

    await anna.get(`/entries/${entry.id}`).expect(404);
    expect((await anna.get('/pins').expect(200)).body).toEqual([]);
  });

  it('answers 400 for an id that is not a UUID', async () => {
    await anna.get('/logbooks/not-a-uuid').expect(400);
  });
});
