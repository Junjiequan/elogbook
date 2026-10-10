import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { INestApplication } from '@nestjs/common';
import { ProposalsService } from '../src/proposals/proposals.service.js';
import { createTestApp, publicApi, resetDatabase, signUp } from './helpers.js';

describe('proposals', () => {
  let app: INestApplication;
  let dir: string;

  beforeAll(async () => {
    app = await createTestApp();
  });
  beforeEach(async () => {
    await resetDatabase(app);
    dir = mkdtempSync(join(tmpdir(), 'elogbook-proposals-'));
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));
  afterAll(() => app.close());

  const proposals = [
    {
      id: '2026-0001',
      title: 'A title',
      instrument: 'LoKI',
      samples: [{ id: 'S-1', name: 'Sample' }],
    },
  ];

  it('are an empty list until a file is loaded', async () => {
    const anna = await signUp(app, 'Anna', 'anna@example.org');

    expect((await anna.get('/proposals').expect(200)).body).toEqual([]);
  });

  it('serve what the proposals file holds, to anyone signed in', async () => {
    const file = join(dir, 'proposals.json');
    writeFileSync(file, JSON.stringify(proposals));
    app.get(ProposalsService).loadFrom(file);
    const anna = await signUp(app, 'Anna', 'anna@example.org');

    expect((await anna.get('/proposals').expect(200)).body).toEqual(proposals);
  });

  it('are not for people who are not signed in', async () => {
    await publicApi(app).get('/proposals').expect(401);
  });

  it('refuse a file that is not valid, and keep what was loaded before', async () => {
    const good = join(dir, 'good.json');
    writeFileSync(good, JSON.stringify(proposals));
    const service = app.get(ProposalsService);
    service.loadFrom(good);
    const bad = join(dir, 'bad.json');
    writeFileSync(bad, JSON.stringify([{ id: 'x' }]));

    expect(() => service.loadFrom(bad)).toThrowError(/not valid/);
    expect(service.list()).toEqual(proposals);
  });
});
