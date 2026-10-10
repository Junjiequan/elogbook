import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp, PASSWORD, publicApi, resetDatabase, signUp } from './helpers.js';

describe('authentication', () => {
  let app: INestApplication;
  beforeAll(async () => {
    app = await createTestApp();
  });
  beforeEach(() => resetDatabase(app));
  afterAll(() => app.close());

  it('creates an account and signs the person in', async () => {
    const res = await publicApi(app)
      .post('/auth/register', {
        name: 'Anna Lindqvist',
        email: 'Anna@Example.org',
        password: PASSWORD,
      })
      .expect(201);

    expect(res.body.access_token).toEqual(expect.any(String));
    expect(res.body.user).toEqual({
      id: expect.any(String),
      name: 'Anna Lindqvist',
      email: 'anna@example.org', // emails are kept lower-case
    });
    expect(res.body).not.toHaveProperty('user.passwordHash');
  });

  it('refuses a second account with the same email', async () => {
    await signUp(app, 'Anna', 'anna@example.org');
    await publicApi(app)
      .post('/auth/register', { name: 'Other', email: 'ANNA@example.org', password: PASSWORD })
      .expect(409);
  });

  it('refuses a short password and unknown fields', async () => {
    await publicApi(app)
      .post('/auth/register', { name: 'A', email: 'a@example.org', password: 'short' })
      .expect(400);
    await publicApi(app)
      .post('/auth/register', {
        name: 'A',
        email: 'a@example.org',
        password: PASSWORD,
        roles: ['admin'],
      })
      .expect(400);
  });

  it('signs in with the right password only', async () => {
    await signUp(app, 'Anna', 'anna@example.org');

    const ok = await publicApi(app)
      .post('/auth/login', { email: 'anna@example.org', password: PASSWORD })
      .expect(200);
    expect(ok.body.access_token).toEqual(expect.any(String));

    await publicApi(app)
      .post('/auth/login', { email: 'anna@example.org', password: 'nope' })
      .expect(401);
    await publicApi(app)
      .post('/auth/login', { email: 'nobody@example.org', password: PASSWORD })
      .expect(401);
  });

  it('says who is signed in, and whether they are an administrator', async () => {
    const anna = await signUp(app, 'Anna', 'anna@example.org');
    const admin = await signUp(app, 'Admin', 'admin@example.org');

    expect((await anna.get('/auth/whoami').expect(200)).body).toEqual({
      user: anna.user,
      isAdmin: false,
    });
    expect((await admin.get('/auth/whoami').expect(200)).body.isAdmin).toBe(true);
  });

  it('keeps every route but sign-in, sign-up and health behind a token', async () => {
    await publicApi(app).get('/logbooks').expect(401);
    await publicApi(app).get('/auth/whoami').expect(401);
    await request(app.getHttpServer())
      .get('/api/v1/logbooks')
      .set('Authorization', 'Bearer not-a-token')
      .expect(401);
    await publicApi(app).get('/health').expect(200);
  });

  it('does not accept a token in the URL', async () => {
    const anna = await signUp(app, 'Anna', 'anna@example.org');
    await request(app.getHttpServer())
      .get(`/api/v1/logbooks?access_token=${anna.token}`)
      .expect(401);
  });

  it('stops accepting the token once the account is gone', async () => {
    const anna = await signUp(app, 'Anna', 'anna@example.org');
    await app.get(DataSource).query('DELETE FROM users');
    await anna.get('/auth/whoami').expect(401);
  });
});
