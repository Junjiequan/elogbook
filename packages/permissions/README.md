# @elogbook/permissions

Who may do what with a logbook, written once with [CASL](https://casl.js.org) and used by both apps:
the API asks it before every action (`backend/src/casl`), and the Angular app asks it to show or hide buttons
(`frontend/src/app/core/auth/permissions.ts`). A rule changes in one function, `defineAbilityFor` in `src/ability.ts`.

| Action      | Who                                                                                                   |
| ----------- | ----------------------------------------------------------------------------------------------------- |
| `read`      | members; anyone, when the logbook is open to the facility (`facility-read`) and is not a demo logbook |
| `write`     | owners and editors (create and change entries)                                                        |
| `configure` | owners (settings and members)                                                                         |
| `delete`    | owners; administrators, for what they can open                                                        |
| `create`    | anyone signed in                                                                                      |

Entries have the permissions of their logbook.

```ts
import { defineAbilityFor, logbookSubject, entrySubject } from '@elogbook/permissions';

const ability = defineAbilityFor({ id: user.id, isAdmin });
ability.can('write', logbookSubject(logbook));
ability.can('delete', entrySubject(logbook));
```

A logbook may list its members as `{ userId, role }` (the API) or `{ user: { id }, role }` (the app).

## One rule lives outside this package

"Which logbooks can I open?" is a database query, so the `WHERE` in `LogbooksService.list` repeats the `read` rule in SQL.
The e2e spec `backend/test/permissions.e2e-spec.ts` fails if the two disagree.

## Working on it

```bash
npm test -w @elogbook/permissions
npm run build:packages        # the apps import the compiled dist/
```
