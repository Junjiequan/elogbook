import { defineAbilityFor, logbookSubject } from '../src/casl/ability.js';
import type { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Logbook } from '../src/logbooks/entities/logbook.entity.js';
import { createTestApp, type Person, resetDatabase, signUp } from './helpers.js';

/**
 * The rules are written once, in `@elogbook/permissions`. Most of the API asks them directly, but the list
 * of logbooks is a SQL query, so this spec checks that the database and the rules give the same answers
 * for every person and every kind of logbook.
 */
describe('the API agrees with the permission rules', () => {
  let app: INestApplication;
  let people: Record<string, Person>;
  let logbookIds: string[];

  beforeAll(async () => {
    app = await createTestApp();
  });
  beforeEach(async () => {
    await resetDatabase(app);
    people = {
      owner: await signUp(app, 'Owner', 'owner@example.org'),
      editor: await signUp(app, 'Editor', 'editor@example.org'),
      viewer: await signUp(app, 'Viewer', 'viewer@example.org'),
      stranger: await signUp(app, 'Stranger', 'stranger@example.org'),
      admin: await signUp(app, 'Admin', 'admin@example.org'),
    };
    const { owner, editor, viewer } = people;

    const privateBook = await owner.createLogbook('Private');
    await owner.share(privateBook, [
      { person: editor, role: 'editor' },
      { person: viewer, role: 'viewer' },
    ]);
    const open = await owner.createLogbook('Open to the facility');
    await owner.patch(`/logbooks/${open}`, { visibility: 'facility-read' }).expect(200);
    const sharedOpen = await owner.createLogbook('Shared and open');
    await owner.share(sharedOpen, [{ person: editor, role: 'editor' }]);
    await owner.patch(`/logbooks/${sharedOpen}`, { visibility: 'facility-read' }).expect(200);
    const adminViewer = await owner.createLogbook('Admin is a viewer');
    await owner.share(adminViewer, [{ person: people.admin, role: 'viewer' }]);
    // Sample logbooks are personal, even when one of them is open to the facility.
    await owner.post('/demo').expect(200);
    const demo = (await owner.get('/logbooks').expect(200)).body.filter((l: any) => l.demo);
    const ownedDemo = demo.find((l: any) => l.myRole === 'owner');
    await owner.patch(`/logbooks/${ownedDemo.id}`, { visibility: 'facility-read' }).expect(200);
    const demoIds: string[] = [
      ownedDemo,
      ...demo.filter((l: any) => l !== ownedDemo).slice(0, 2),
    ].map((l: any) => l.id);
    logbookIds = [privateBook, open, sharedOpen, adminViewer, ...demoIds];
  });
  afterAll(() => app.close());

  it('lists exactly the logbooks the rules say each person may read', async () => {
    const stored = await app
      .get(DataSource)
      .getRepository(Logbook)
      .find({ relations: { members: true } });

    for (const [name, person] of Object.entries(people)) {
      const ability = defineAbilityFor({ id: person.user.id, isAdmin: name === 'admin' });
      const expected = stored
        .filter((logbook) => ability.can('read', logbookSubject(logbook)))
        .map((logbook) => logbook.id)
        .sort();

      const listed = (await person.get('/logbooks').expect(200)).body.map((l: any) => l.id).sort();

      expect(listed, `what ${name} sees`).toEqual(expected);
    }
  });

  it('answers each request the way the rules say, for every person and logbook', async () => {
    const stored = await app
      .get(DataSource)
      .getRepository(Logbook)
      .find({ relations: { members: true } });

    for (const [name, person] of Object.entries(people)) {
      const ability = defineAbilityFor({ id: person.user.id, isAdmin: name === 'admin' });
      for (const id of logbookIds) {
        const subject = logbookSubject(stored.find((l) => l.id === id)!);
        const status = (allowed: boolean, ok: number) =>
          ability.can('read', subject) ? (allowed ? ok : 403) : 404;
        const label = (what: string) => `${name} ${what} ${stored.find((l) => l.id === id)!.title}`;

        expect((await person.get(`/logbooks/${id}`)).status, label('reads')).toBe(
          status(ability.can('read', subject), 200),
        );
        expect(
          (await person.patch(`/logbooks/${id}`, { description: 'x' })).status,
          label('configures'),
        ).toBe(status(ability.can('configure', subject), 200));
        expect((await person.post(`/logbooks/${id}/entries`)).status, label('writes in')).toBe(
          status(ability.can('write', subject), 201),
        );
      }
    }
  });
});
