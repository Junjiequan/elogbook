import type { INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/configure-app.js';

const API = '/api/v1';

export async function createTestApp(): Promise<NestExpressApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>({ bodyParser: false });
  configureApp(app);
  await app.init();
  return app;
}

/** Every table emptied, so each spec starts from nothing and cannot depend on another. */
export async function resetDatabase(app: INestApplication): Promise<void> {
  await app
    .get(DataSource)
    .query(
      'TRUNCATE users, logbooks, logbook_members, entries, entry_versions, pinned_entries CASCADE',
    );
}

export const PASSWORD = 'password123';

/** A signed-in person talking to the API. */
export class Person {
  constructor(
    private readonly app: INestApplication,
    readonly token: string,
    readonly user: { id: string; name: string; email: string },
  ) {}

  get email(): string {
    return this.user.email;
  }

  private req(method: 'get' | 'post' | 'patch' | 'put' | 'delete', path: string) {
    return request(this.app.getHttpServer())
      [method](`${API}${path}`)
      .set('Authorization', `Bearer ${this.token}`);
  }

  get = (path: string) => this.req('get', path);
  post = (path: string, body?: object) => this.req('post', path).send(body);
  patch = (path: string, body?: object) => this.req('patch', path).send(body);
  put = (path: string, body?: object) => this.req('put', path).send(body);
  delete = (path: string) => this.req('delete', path);

  /** Creates a logbook and returns its id. */
  async createLogbook(title = 'Beamtime', extra: object = {}): Promise<string> {
    const res = await this.post('/logbooks', { title, ...extra }).expect(201);
    return res.body.id;
  }

  /** Shares the logbook with the given people (the owner stays an owner). */
  async share(
    logbookId: string,
    people: { person: Person; role: 'owner' | 'editor' | 'viewer' }[],
  ): Promise<void> {
    await this.patch(`/logbooks/${logbookId}`, {
      members: [
        { email: this.email, role: 'owner' },
        ...people.map(({ person, role }) => ({ email: person.email, role })),
      ],
    }).expect(200);
  }

  async createEntry(logbookId: string): Promise<{ id: string; revision: number }> {
    const res = await this.post(`/logbooks/${logbookId}/entries`).expect(201);
    return res.body;
  }
}

export const publicApi = (app: INestApplication) => ({
  post: (path: string, body?: object) =>
    request(app.getHttpServer()).post(`${API}${path}`).send(body),
  get: (path: string) => request(app.getHttpServer()).get(`${API}${path}`),
});

export async function signUp(app: INestApplication, name: string, email: string): Promise<Person> {
  const res = await publicApi(app)
    .post('/auth/register', { name, email, password: PASSWORD })
    .expect(201);
  return new Person(app, res.body.access_token, res.body.user);
}
