# Dummy data (development and demos only)

A tool that lives **outside both apps**. Nothing in `frontend/` or `backend/` knows about it: it fills the
database directly, only when you run it, and removes what it made when you ask. The API never makes any of this by
itself, and `seed` refuses to do anything unless `ENABLE_DEMO` is exactly `true` (in `backend/.env` or the environment;
unset, `false` or anything else means nothing is made). `remove` always works.

## Commands

Run them from the repository root (or from `backend/`, which has the same scripts):

```bash
npm run dummy:seed      # give everyone who can sign in 30 dummy logbooks (needs ENABLE_DEMO=true)
npm run dummy:remove    # remove exactly those logbooks again
```

To do it for some people only: `npm run seed -w @elogbook/demo -- --users anna@example.org,jon@example.org`
(the same for `remove`). The database is found through `DATABASE_URL`, which is read from `backend/.env`; with the Docker
stack that is the PostgreSQL on `localhost:5433`, so these work while it runs.

## What it makes

For each person, 30 realistic logbooks: one detailed three-day LoKI SANS beamtime (run tables, sample blocks, checklists,
a shear-cell schematic, a detector image, an I(Q) plot, fit results, a leak incident, handover notes and a version
history) and 29 smaller ones across the instruments. About 50 entries with version history, three pinned entries, and
fictional colleagues as members with different roles (owner / editor / viewer). The figures and numbers are illustrative.

- **Personal.** Every dummy logbook is _private_ and lists only that person and fictional colleagues (made as invited
  accounts, who cannot sign in), so nobody else sees yours.
- **Repeatable.** Ids are derived from the person and the content, so running `seed` again adds only what is missing and
  never makes anything twice. `remove` finds the same ids, so it removes exactly the dummy logbooks and nothing else.
  After that they are ordinary logbooks in every way: roles apply, and an owner can delete them one by one.
- **Pins:** someone who has pinned nothing gets three; anyone with pins of their own keeps only those.

## Where things are

|                  |                                                                                          |
| ---------------- | ---------------------------------------------------------------------------------------- |
| `src/content/`   | the dummy content (logbook specs, entry builders, figures) and its tests                 |
| `src/seed.ts`    | writes and removes the rows (plain SQL, one transaction per person)                      |
| `src/enabled.ts` | the `ENABLE_DEMO` switch                                                                 |
| `src/cli.ts`     | the command line                                                                         |
| `test/`          | runs the tool against a real PostgreSQL (after the backend's tests have made the tables) |

The tool depends on the database tables of `backend/`; if a column changes there, `src/seed.ts` and its test show it.

```bash
npm test -w @elogbook/demo          # the content and the switch, no database
npm run test:e2e -w @elogbook/demo  # against PostgreSQL (npm run test:e2e at the root runs the backend's first)
```
