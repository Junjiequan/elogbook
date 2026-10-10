# eLogbook backend

REST API for the eLogbook: sign-in, logbooks and their members, entries, version history and pins.
NestJS 12 (ESM) + TypeORM + PostgreSQL. Its JSON uses the same shapes as the Angular app's models
(`frontend/src/app/core/models/logbook.models.ts`), so the frontend only needs an HTTP implementation of
`LogbookRepository`.

## Run it

From the repository root:

```bash
npm install
npm run setup:backend                          # starts PostgreSQL and creates backend/.env with a random JWT_SECRET
npm run build -w backend && npm run seed -w backend   # optional: the three demo accounts (password demo1234)
npm run start:backend                          # http://localhost:3000/api/v1, docs at /api/docs
```

Or everything in Docker, with hot reload: `npm run up` (see "Run it all in Docker" in the root README).

Migrations run when the API starts (`DATABASE_MIGRATE=true`). `synchronize` is off: the tables only ever change
through a migration in `src/database/migrations/`.

## Configuration

Read in one place, `src/config/configuration.ts`, and checked at start-up: a missing or unusable value stops the API with
a clear message. See `.env.example` for every setting.

| Variable                        | Meaning                                                                             |
| ------------------------------- | ----------------------------------------------------------------------------------- |
| `DATABASE_URL`                  | PostgreSQL connection string (required)                                             |
| `JWT_SECRET`                    | Signs access tokens; at least 32 characters (required)                              |
| `JWT_EXPIRES_IN`                | Token lifetime in seconds (default 8 hours)                                         |
| `AUTH_ALLOW_REGISTRATION`       | Let people create an account with `POST /auth/register` (default true)              |
| `ADMIN_EMAILS`                  | Emails that get the `admin` role                                                    |
| `DEMO_ENABLED`                  | Allow `POST` / `DELETE /demo` (sample logbooks); on by default except in production |
| `CORS_ORIGINS`                  | Browser origins allowed to call the API                                             |
| `TRUST_PROXY`                   | Number of reverse proxies in front of the API, so rate limits see the real client   |
| `RATE_LIMIT`, `AUTH_RATE_LIMIT` | Requests per minute per client: in general, and for sign-in / sign-up               |

## Authentication

The layout follows SciCat's backend (`scicat-backend-next/src/auth`): an `auth` module with a controller, a service,
Passport strategies (`local` and `jwt`), guards, a `Role` enum and decorators.

- `POST /auth/login` (email + password) and `POST /auth/register` return `{ access_token, expires_in, user, isAdmin }`.
- Every other request sends `Authorization: Bearer <token>`. `GET /auth/whoami` says who that is.
- Every route needs a token unless it is marked `@Public()`. `@Roles(Role.Admin)` restricts a route by role.
- Logbook permissions (owner / editor / viewer, facility-read, administrators) are defined once, with CASL, in
  [`packages/permissions`](../packages/permissions/README.md), the same package the Angular app uses. `src/casl/` builds the
  ability for the signed-in person (SciCat's `CaslAbilityFactory`), and the services ask it on every request: a logbook you
  cannot open answers 404, one you can read but not change answers 403.

A facility identity provider (OIDC, LDAP) is added the way SciCat does it: another Passport strategy in
`auth/strategies/` (`oidc.strategy.ts`) that finds or creates the `users` row and then calls `AuthService.login`.
Nothing else changes, because the JWT strategy only knows the user's id.

### Where this differs from SciCat's backend, and why

- **PostgreSQL and TypeORM instead of MongoDB.** Permissions are joins and an entry save plus its version is one transaction.
- **Deny by default.** SciCat's JWT guard lets a request without a token through and each route must check; here a route is closed
  unless `@Public()`, so a forgotten check cannot expose data.
- **The token is only read from the `Authorization` header**, not from `?access_token=`: URLs end up in logs and browser history.
- **Passwords use scrypt from Node's `crypto`** instead of bcrypt: same strength class, nothing native to compile in CI or Docker.
- **One user lookup per request** (instead of roles and identity lookups): a deleted person or a changed role takes effect at once.
- **Login returns `{ access_token, expires_in, user, isAdmin }`** without LoopBack-era duplicates (`id`, `ttl`, `created`, `userId`).
- **Rate limits on sign-in and sign-up**, `helmet` security headers, and a CORS allow-list instead of "any origin".
- **Typed, validated configuration** in one file instead of environment variables read all over the code.
- **Nest 12 defaults:** ESM, Vitest and oxlint instead of CommonJS, Jest and ESLint.

## API

All under `/api/v1`. Interactive docs: `/api/docs` (Swagger).

| Method and path                                                               | Who                                        | What                                                                                                                          |
| ----------------------------------------------------------------------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| `GET /health`                                                                 | anyone                                     | 200 while the database answers                                                                                                |
| `POST /auth/register`, `POST /auth/login`, `GET /auth/whoami`                 | anyone / anyone / signed in                | see above                                                                                                                     |
| `GET /logbooks`, `POST /logbooks`                                             | signed in                                  | the logbooks you can open (newest first); create one (you become its owner)                                                   |
| `GET /logbooks/:id`                                                           | reader                                     | one logbook with its members                                                                                                  |
| `PATCH /logbooks/:id`                                                         | owner                                      | title, description, visibility, and the complete member list (`[{ email, role }]`); someone not signed up yet is invited      |
| `DELETE /logbooks/:id`                                                        | owner, or an administrator who can open it | removes entries, versions and pins too                                                                                        |
| `GET /logbooks/:id/entries`, `POST /logbooks/:id/entries`                     | reader / writer                            | list, newest first; create an empty entry                                                                                     |
| `GET /entries/:id`, `PATCH /entries/:id`, `DELETE /entries/:id`               | reader / writer / owner or admin           | `PATCH` needs `revision`: 409 with `currentRevision` if someone saved since                                                   |
| `GET /entries/:id/versions`, `POST /entries/:id/versions`                     | reader / writer                            | history; keep a manual version                                                                                                |
| `POST /entries/:id/versions/:versionId/restore`                               | writer                                     | restores, keeping what it replaces                                                                                            |
| `GET /demo`, `POST /demo`, `DELETE /demo`                                     | signed in                                  | sample content for trying the app (404 when `DEMO_ENABLED` is off): how many sample logbooks you have; make them; remove them |
| `GET /pins`, `PUT /pins/:entryId`, `DELETE /pins/:entryId`, `PUT /pins/order` | signed in                                  | your own pins (at most 4, 409 `PIN_LIMIT_REACHED` beyond that) and their order                                                |

Every logbook in a response says what the person asking may do with it (`myRole`, `canWrite`, `canConfigure`, `canDelete`),
so a screen never works permissions out for itself.

### Sample content

`POST /demo` makes the signed-in person a set of realistic logbooks (a detailed three-day LoKI beamtime and about a dozen
smaller ones, about 30 entries, version history, a few pins), with fictional colleagues as members. Making them again
adds only what is missing and keeps your edits. `DELETE /demo` removes exactly the logbooks `POST /demo` made for you, with
their entries, versions and pins; real logbooks are never touched. Sample logbooks are personal: they carry
`demo_user_id`, and the facility-wide read rule does not apply to them, so nobody else sees them. The content is built in
`src/demo/` and is illustrative, not real measurements.

Automatic versions are taken at most every 5 minutes and only when the entry changed, as in the frontend.

## Data model

`users` (email, name, password hash, roles, `invited`) · `logbooks` (`demo_user_id` marks sample logbooks) · `logbook_members` (logbook, user, role) ·
`entries` (content as `jsonb`, `revision`) · `entry_versions` · `pinned_entries` (user, entry, position).
Deleting a logbook or entry cascades. `CHECK` constraints keep roles, visibility and version reasons to known values.

## Tests

```bash
npm test -w backend            # unit tests (Vitest), no database
npm run test:e2e -w backend    # the real app against PostgreSQL (npm run db:up first; uses the elogbook_test database)
```

The e2e specs cover sign-in, the permission rules for owner / editor / viewer / stranger / administrator, optimistic
locking (including two simultaneous saves), version history and restore, the pin limit and order (including pins made at
the same instant), a check that the list query and the permission rules give the same answers for every person and logbook, and a check that the migrations produce exactly the schema the entities describe.

## Changing the database

Change an entity, then add a migration next to `1760000000000-initial-schema.ts` and list it in `src/database/database.config.ts`.
The schema e2e spec fails if the entities and the migrations disagree.

## Not built yet

- The frontend's `HttpLogbookRepository` and an `AuthService` that uses `/auth/login` (the API is ready for both).
- OIDC / LDAP sign-in, email verification, password reset.
- Pagination of the entry list, image upload to object storage (entries embed images today, as in the frontend), full-text search.
- Real-time collaboration.
