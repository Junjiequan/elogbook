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
npm run dummy:seed                             # optional: 30 dummy logbooks for everyone; needs ENABLE_DEMO=true (see demo)
npm run start:backend                          # http://localhost:3000/api/v1, docs at /api/docs
```

Or everything in Docker, with hot reload: `npm run up` (see "Run it all in Docker" in the root README).

Migrations run when the API starts (`DATABASE_MIGRATE=true`). `synchronize` is off: the tables only ever change
through a migration in `src/database/migrations/`.

## Configuration

Read in one place, `src/config/configuration.ts`, and checked at start-up: a missing or unusable value stops the API with
a clear message. See `.env.example` for every setting.

| Variable                        | Meaning                                                                                                                                |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                  | PostgreSQL connection string (required)                                                                                                |
| `JWT_SECRET`                    | Signs access tokens; at least 32 characters (required)                                                                                 |
| `JWT_EXPIRES_IN`                | Token lifetime in seconds (default 8 hours)                                                                                            |
| `AUTH_ALLOW_REGISTRATION`       | Let people create an account with `POST /auth/register` (default true)                                                                 |
| `ADMIN_EMAILS`                  | Emails that get the `admin` role                                                                                                       |
| `CONFIG_DIR`                    | Folder of JSON files that describe the deployment (default `./config`; see `config/README.md`)                                         |
| `LOCAL_ACCOUNTS_FILE`           | JSON file of accounts to create at start-up, e.g. the first administrators (default `<CONFIG_DIR>/local-accounts.json` when it exists) |
| `PROPOSALS_FILE`                | JSON file of the proposals the app offers (default `<CONFIG_DIR>/proposals.json`)                                                      |
| `CORS_ORIGINS`                  | Browser origins allowed to call the API                                                                                                |
| `TRUST_PROXY`                   | Number of reverse proxies in front of the API, so rate limits see the real client                                                      |
| `RATE_LIMIT`, `AUTH_RATE_LIMIT` | Requests per minute per client: in general, and for sign-in / sign-up                                                                  |

## Authentication

The layout follows SciCat's backend (`scicat-backend-next/src/auth`): an `auth` module with a controller, a service,
Passport strategies (`local` and `jwt`), guards, a `Role` enum and decorators.

- `POST /auth/login` (email + password) and `POST /auth/register` return `{ access_token, expires_in, user, isAdmin }`.
- Every other request sends `Authorization: Bearer <token>`. `GET /auth/whoami` says who that is.
- Every route needs a token unless it is marked `@Public()`. `@Roles(Role.Admin)` restricts a route by role.
- Logbook permissions (owner / editor / viewer, facility-read, administrators) are defined once, with CASL, in
  `src/casl/ability.ts` (`defineAbilityFor`). `CaslAbilityFactory` builds the ability for the signed-in person (as in
  SciCat), and the services ask it on every request: a logbook you cannot open answers 404, one you can read but not
  change answers 403. Every logbook in a response also carries what the person may do with it (`myRole`, `canWrite`,
  `canConfigure`, `canDelete`), so the Angular app applies no rules of its own.

### OAuth sign-in (Google today, Ping later)

People can also sign in through an identity provider, with OpenID Connect (OAuth 2.0 authorization code flow with PKCE,
done with `openid-client`). It is on when `OAUTH_ISSUER` is set and configured entirely by environment variables
(`OAUTH_*` in `.env.example`), so switching from Google to Ping is a change of values, not of code. The web app shows a
"Continue with Google" button only when the API says it is set up (`GET /auth/oauth`).

| Variable                                                       | What it is                                                                                                    |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `OAUTH_ISSUER`                                                 | The provider's address (`https://accounts.google.com`); its `/.well-known/openid-configuration` says the rest |
| `OAUTH_CLIENT_ID`, `OAUTH_CLIENT_SECRET`                       | From the provider, when you register the app with it                                                          |
| `OAUTH_REDIRECT_URI`                                           | This API's `/api/v1/auth/oauth/callback` as the browser reaches it; registered with the provider exactly      |
| `OAUTH_FRONTEND_URL`                                           | The web app: people land on `<it>/auth/callback` after signing in, or on `<it>/login?oauthError=…`            |
| `OAUTH_LABEL`                                                  | The button text ("Google")                                                                                    |
| `OAUTH_ALLOWED_EMAIL_DOMAINS`, `OAUTH_CREATE_ACCOUNTS`         | Who may sign in: only listed domains; and whether new people get an account on first sign-in                  |
| `OAUTH_CLIENT_AUTHENTICATION`, `OAUTH_SCOPES`, `OAUTH_ENABLED` | Rarely needed: how the secret is sent, extra scopes, a switch to turn it off                                  |

How it goes: the browser opens `GET /auth/oauth/login`, which sends it to the provider with a one-time `state`, `nonce` and
PKCE challenge (their secret halves wait in a signed, `HttpOnly`, 10 minute cookie). The provider sends it back to
`GET /auth/oauth/callback` with a code; the API swaps the code for an ID token (checking signature, issuer, audience,
`nonce`, `state` and PKCE) and redirects to the web app with the same access token a password sign-in gives, in the
address fragment (never in a query string or a log). Nothing else in the API knows how someone signed in.

**What is stored.** Only the usual `users` row (email, name, no password) and one row in `user_identities`: the provider
(`iss`), its stable id for the person (`sub`) and the link to the user. No tokens, picture or other profile data.
People are recognised by `iss` + `sub`, never by email alone, because an email can change hands:

1. A known `iss` + `sub` signs in to its account, whatever email the provider shows now.
2. A first sign-in is matched by email to an existing account (password or invited, so logbooks shared with them are
   there at once) and linked; with no match, an account is created (unless `OAUTH_CREATE_ACCOUNTS=false`).
3. An account already linked to a different `sub` at the same provider is refused (`conflict`), so a recycled email
   cannot take over an account.

The provider must say `email_verified: true`; anything else is refused. Domains can be limited with
`OAUTH_ALLOWED_EMAIL_DOMAINS`.

For development with Google: create an OAuth client (Web application) in the Google Cloud console, add
`http://localhost:4300/api/v1/auth/oauth/callback` as an authorised redirect URI, put the five values in `backend/.env`,
and `npm start`. Turn `AUTH_ALLOW_REGISTRATION` off when everyone should come through the provider; otherwise somebody can register an address that is not theirs, with a password only they know, before its owner first signs in with OAuth.
`test/oauth.e2e-spec.ts` runs the whole flow against a small fake provider that really checks the secret, PKCE and codes.

### Administrator accounts: the local accounts file

How a facility gets its first administrators without anyone signing up for them, as SciCat does with
`functionalAccounts.json`. Put the accounts in `backend/config/local-accounts.json` (git-ignored; `npm run setup:backend`
creates it from `config/local-accounts.example.json` with three admin accounts and a random password each, which you
read in the file) and the API creates them when it starts:

```json
[
  {
    "email": "admin@example.org",
    "name": "Facility Admin",
    "password": "a-long-password-of-12+",
    "roles": ["admin"]
  }
]
```

- **`roles`:** `["admin"]` may delete any logbook or entry they can already open (administrators get no extra
  access to read). An empty list makes an ordinary account.
- **Passwords:** `password` is hashed before it is stored; an administrator's needs at least 12 characters. If the file
  must not hold passwords, give `passwordHash` (a `scrypt$...` hash made by this API) instead.
- **The file is the truth for the accounts it lists.** On every start their name, roles and password are brought in
  line with it, so changing a password, or taking away `admin`, is an edit of the file and a restart. An email that
  someone has already registered is taken over the same way. People it does not list are never touched.
- **A bad file stops the API with every problem listed**, and in production the example's `CHANGE-ME…` passwords are refused.
- **Another place:** `LOCAL_ACCOUNTS_FILE=/path/to/file.json` (a missing file that was asked for by name is an error).
  `ADMIN_EMAILS` still works too: it makes accounts administrators by email, whichever way they were made.

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

| Method and path                                                               | Who                                        | What                                                                                                                                                                                                           |
| ----------------------------------------------------------------------------- | ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /health`                                                                 | anyone                                     | 200 while the database answers                                                                                                                                                                                 |
| `POST /auth/register`, `POST /auth/login`, `GET /auth/whoami`                 | anyone / anyone / signed in                | see above                                                                                                                                                                                                      |
| `GET /logbooks`, `POST /logbooks`                                             | signed in                                  | the logbooks you can open (newest first); create one (you become its owner)                                                                                                                                    |
| `GET /logbooks/:id`                                                           | reader                                     | one logbook with its members                                                                                                                                                                                   |
| `PATCH /logbooks/:id`                                                         | owner                                      | title, description, visibility, and the complete member list (`[{ email, role }]`) (it needs at least one `owner`; to hand the logbook over, make someone else an owner); someone not signed up yet is invited |
| `DELETE /logbooks/:id`                                                        | owner, or an administrator who can open it | removes entries, versions and pins too                                                                                                                                                                         |
| `GET /logbooks/:id/entries`, `POST /logbooks/:id/entries`                     | reader / writer                            | list, newest first; create an empty entry                                                                                                                                                                      |
| `GET /entries/:id`, `PATCH /entries/:id`, `DELETE /entries/:id`               | reader / writer / owner or admin           | `PATCH` needs `revision`: 409 with `currentRevision` if someone saved since                                                                                                                                    |
| `GET /entries/:id/versions`, `POST /entries/:id/versions`                     | reader / writer                            | history; keep a manual version                                                                                                                                                                                 |
| `POST /entries/:id/versions/:versionId/restore`                               | writer                                     | restores, keeping what it replaces                                                                                                                                                                             |
| `GET /proposals`                                                              | signed in                                  | the proposals (with instrument and samples) from `config/proposals.json`; empty when there is no file                                                                                                          |
| `GET /pins`, `PUT /pins/:entryId`, `DELETE /pins/:entryId`, `PUT /pins/order` | signed in                                  | your own pins (at most 4, 409 `PIN_LIMIT_REACHED` beyond that) and their order                                                                                                                                 |

Every logbook in a response says what the person asking may do with it (`myRole`, `canWrite`, `canConfigure`, `canDelete`),
so a screen never works permissions out for itself.

### Dummy logbooks

The API has nothing to do with them. The `demo/` tool fills the database with dummy logbooks when you run
`npm run dummy:seed` (from here or from the root) and removes them with `npm run dummy:remove`; see its README.

Automatic versions are taken at most every 5 minutes and only when the entry changed, as in the frontend.

## Data model

`users` (email, name, password hash, roles, `invited`) · `logbooks` (`owner_id`: the person responsible, also an `owner` member) · `logbook_members` (logbook, user, role) ·
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

Change an entity, then update `src/database/migrations/1760000000000-initial-schema.ts` to match. Nothing is deployed yet, so
it is edited in place; once a database exists somewhere, add a new migration next to it and list it in
`src/database/database.config.ts` instead.
The schema e2e spec fails if the entities and the migrations disagree.

## Not built yet

- LDAP sign-in, email verification, password reset.
- Pagination of the entry list, image upload to object storage (entries embed images today, as in the frontend), full-text search.
- Real-time collaboration.
