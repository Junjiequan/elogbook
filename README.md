# ESS eLogbook

Electronic logbook for experiments at the European Spallation Source.
Angular 20 (standalone, signals, zoneless) + Angular Material 3 + Tiptap (ProseMirror).

**Live demo:** https://junjiequan.github.io/elogbook/ (data stays in your own browser).
Licence: [MIT](LICENSE).

This is the **frontend-only MVP**: data is stored in the browser (IndexedDB). A NestJS backend is
planned; the code is arranged so that adding it does not touch the UI.

```bash
npm install
npm start          # http://localhost:4200
npm test           # Karma + Jasmine in watch mode (needs Chrome; set CHROME_BIN if it is not found)
npm run test:ci    # single headless run
npm run lint
```

First start seeds a demo logbook. Sign in with one of the demo accounts on the login page (password
`demo1234`): Anna Lindqvist (owner), Jon Carter (editor) or Mei Tanaka (viewer), or create your own account.
Share a logbook with another account's email address to try the permissions.

## What the MVP covers

| Requirement | Status |
| --- | --- |
| WYSIWYG, Word-like paste | Tiptap editor: headings, lists, checklists, tables, links, code, highlight, alignment. Pasting from Word / Excel / web keeps structure. |
| Paste images from analysis software | Pasted or dropped image files are inserted inline (downscaled to ≤1920 px). |
| Photos from a tablet | Toolbar "Take photo" opens the camera on tablets and phones. Layout is responsive. |
| Sample information | "Insert sample information" adds a structured sample / proposal / instrument block (mock proposal data for now). |
| Auto-saving | Debounced, serialised, retried on failure, flushed on tab hide / navigation. Status shown in the entry bar. |
| Version control | Automatic snapshots (at most every 5 min), manual "Save version", preview any version, restore. A restore keeps the replaced text in the history, so nothing is ever lost. |
| Privacy controls | Share dialog: owner / editor / viewer per person, plus Private vs Facility-wide read. Viewers get a read-only editor. **UI only until the backend enforces it.** |
| Export | "Export" renders the logbook (or one entry) as a clean page; use Print → Save as PDF. |

## Not yet built (needs backend or decisions)

- **Live collaboration / "see updates at home".** Plan: Yjs with the Tiptap collaboration extension and a
  Hocuspocus (or NestJS WebSocket) server. The editor is already isolated in `RichTextEditor`, so this changes
  that component and the repository, not the pages.
- **Real authentication / no-VPN access.** Plan: OIDC against the facility identity provider. See "Test sign-in" below for what exists today and how to replace it.
- **Real proposal / sample data.** Implement `ExperimentContext` against the proposal system or SciCat.
- **Instrument scan macros.** Plan: a second structured node (like `sampleInfo`) created from control-software
  events, e.g. a "scan" block with run number and a link to the data.
- **Image storage.** Images are currently embedded in the entry. Replace `ImageService` with an upload that returns a URL.
- **Search across entries, templates, comments.**

## Architecture

```
src/app
├── core/                     framework-free logic, no UI
│   ├── models/               Logbook, Entry, EntryVersion, User …
│   ├── auth/                 CurrentUserService (stub), permissions.ts (pure functions)
│   ├── data-access/          LogbookRepository (abstract) + IndexedDB implementation
│   ├── experiment-context/   proposal / sample source (abstract + static data)
│   └── images/               ImageService
├── features/
│   ├── logbooks/             list page, create dialog, LogbooksStore (root)
│   ├── logbook/              logbook shell (entry list), EntriesStore (page-scoped)
│   ├── entry/                entry page + EntryAutosave (component-scoped)
│   ├── editor/               RichTextEditor, toolbar, Tiptap extensions
│   ├── history/              version list
│   ├── sharing/              share dialog
│   └── print/                export page
└── shared/                   small reusable dialogs
```

Conventions

- Standalone components, `OnPush`, signals for state, `input()` / `output()`, new control flow, lazy-loaded routes.
- Route params arrive as component inputs (`withComponentInputBinding`).
- **Swap points for the backend**: `LogbookRepository`, `ExperimentContext` (both provided in `app.config.ts`),
  `ImageService`, `CurrentUserService`. Write an `HttpLogbookRepository` and change one provider line.
- Stores: root-level for data shared across pages (`LogbooksStore`), component-scoped (`providers: [...]`) for
  state that should die with the page (`EntriesStore`, `EntryAutosave`).
- The editor owns the live document. `RichTextEditor` is keyed by `docKey`; changing the key rebuilds it, which
  also clears undo history so Ctrl+Z cannot cross entries.
- Document schema is defined in one place: `features/editor/extensions/editor-extensions.ts`.
- Access rules live in `core/auth/permissions.ts` as pure functions, so the backend can mirror them and tests stay simple.

## Test sign-in (temporary)

Sign up / sign in exists only so the app can be tried by several people. It is **not secure**: accounts
live in the browser's localStorage (passwords are salted + hashed with PBKDF2, but there is no server, no
email verification, and anyone can edit their own browser storage). A user's id is their lower-case email,
so sharing by email works before that person has signed up.

Everything is in `src/app/features/test-auth/`. The rest of the app only knows the abstract `AuthService`
(`core/auth`), a route guard, and `CurrentUserService`.

**To remove it later**

1. Delete `src/app/features/test-auth/`.
2. In `app.config.ts`, delete the `TestAuthService` provider lines and provide your own `AuthService`
   (e.g. an OIDC client that exposes `user: Signal<User | null>` and `signOut()`).
3. In `app.routes.ts`, point the `login` route at your login/redirect page (or remove it; `authGuard`
   redirects signed-out visitors to `/login` with a `returnUrl`).
4. Optionally drop `DEMO_USERS` from `core/data-access/demo-data.ts` if you no longer want the demo logbook.

**Sign in with Google (optional)**

The Google button appears only when a client ID is set. Google must be told which sites may use it, so
this needs a one-off setup in your own Google Cloud project:

1. Google Cloud Console → *APIs & Services* → *OAuth consent screen* (External, test mode is fine), then
   *Credentials* → *Create credentials* → *OAuth client ID* → *Web application*.
2. Under *Authorized JavaScript origins* add `http://localhost:4200` and `https://junjiequan.github.io`
   (no redirect URI is needed).
3. Paste the client ID into `GOOGLE_CLIENT_ID_VALUE` in `features/test-auth/test-auth.config.ts`.

The ID token is decoded in the browser and its signature is **not** verified (that needs a server), so
treat Google sign-in here as a convenience for testing too.

## Notes

- Fonts and icons are bundled from npm (`@fontsource/roboto`, `material-icons`), so the app works without
  external network access.
- `resource()` (Angular 20) is used for a few read-only loads; it is still marked experimental.
