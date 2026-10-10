import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { LocalAccountsService } from '../src/users/local-accounts.service.js';
import { createTestApp, PASSWORD, publicApi, resetDatabase, signUp } from './helpers.js';

describe('local accounts', () => {
  let app: INestApplication;
  let service: LocalAccountsService;
  let dir: string;

  const write = (accounts: object[]) => {
    const file = join(dir, 'local-accounts.json');
    writeFileSync(file, JSON.stringify(accounts));
    return file;
  };
  const account = (over: object = {}) => ({
    email: 'admin@local.test',
    name: 'Facility Admin',
    roles: ['admin'],
    password: 'first-admin-password',
    ...over,
  });
  const signIn = (email: string, password: string) =>
    publicApi(app).post('/auth/login', { email, password });
  const whoami = async (email: string, password: string) =>
    (await signIn(email, password).expect(200)).body;

  beforeAll(async () => {
    app = await createTestApp();
    service = app.get(LocalAccountsService);
  });
  beforeEach(async () => {
    await resetDatabase(app);
    dir = mkdtempSync(join(tmpdir(), 'elogbook-accounts-'));
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));
  afterAll(() => app.close());

  it('makes the accounts in the file, and they can sign in as administrators', async () => {
    const result = await service.syncFrom(
      write([
        account(),
        account({
          email: 'second@local.test',
          name: 'Second Admin',
          password: 'second-admin-password',
        }),
      ]),
    );

    expect(result).toEqual({ created: 2, updated: 0, unchanged: 0 });
    expect(await whoami('admin@local.test', 'first-admin-password')).toMatchObject({
      isAdmin: true,
      user: { name: 'Facility Admin', email: 'admin@local.test' },
    });
    expect((await whoami('second@local.test', 'second-admin-password')).isAdmin).toBe(true);
  });

  it('can make accounts without a role, who are ordinary people', async () => {
    await service.syncFrom(
      write([account({ email: 'plain@local.test', roles: [], password: 'plain-password' })]),
    );

    expect((await whoami('plain@local.test', 'plain-password')).isAdmin).toBe(false);
  });

  it('does nothing the second time, and does not make a second copy', async () => {
    const file = write([account()]);
    await service.syncFrom(file);

    expect(await service.syncFrom(file)).toEqual({ created: 0, updated: 0, unchanged: 1 });
  });

  it('follows the file: a new password replaces the old one, and taking admin away takes it away', async () => {
    await service.syncFrom(write([account()]));

    const result = await service.syncFrom(
      write([account({ roles: [], password: 'a-brand-new-password', name: 'Renamed' })]),
    );

    expect(result.updated).toBe(1);
    await signIn('admin@local.test', 'first-admin-password').expect(401);
    expect(await whoami('admin@local.test', 'a-brand-new-password')).toMatchObject({
      isAdmin: false,
      user: { name: 'Renamed' },
    });
  });

  it('accepts a password hash, so the file need not hold the password', async () => {
    const donor = await signUp(app, 'Donor', 'donor@local.test');
    const [{ password_hash: hash }] = await app
      .get(DataSource)
      .query("SELECT password_hash FROM users WHERE email = 'donor@local.test'");

    await service.syncFrom(write([account({ password: undefined, passwordHash: hash })]));

    expect(donor.email).toBe('donor@local.test');
    expect((await whoami('admin@local.test', PASSWORD)).isAdmin).toBe(true);
  });

  it('takes over an account that was already made by signing up, with the file’s password and roles', async () => {
    await signUp(app, 'Early Bird', 'admin@local.test');

    const result = await service.syncFrom(write([account()]));

    expect(result.updated).toBe(1);
    await signIn('admin@local.test', PASSWORD).expect(401);
    expect((await whoami('admin@local.test', 'first-admin-password')).isAdmin).toBe(true);
  });

  it('refuses a file that is not valid, and changes nothing', async () => {
    await expect(
      service.syncFrom(
        write([account(), account({ email: 'weak@local.test', password: 'short' })]),
      ),
    ).rejects.toThrowError(/weak@local.test: "password" must be at least 12/);

    await signIn('admin@local.test', 'first-admin-password').expect(401);
  });

  it('says so when the file is not JSON, or is missing', async () => {
    const broken = join(dir, 'broken.json');
    writeFileSync(broken, '{ not json');

    await expect(service.syncFrom(broken)).rejects.toThrowError(/cannot be read as JSON/);
    await expect(service.syncFrom(join(dir, 'nope.json'))).rejects.toThrowError(/cannot be read/);
  });
});
