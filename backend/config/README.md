# Configuration files

JSON files that describe a deployment live here, so there is one place to look (and one folder to mount into a
container: `CONFIG_DIR`, default `./config` next to where the API is started).

| File                  | What it is                                                                                                                                  |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `proposals.json`      | The proposals (with instrument and samples) the app offers when a logbook is made and when a sample is inserted; served by `GET /proposals` |
| `local-accounts.json` | Accounts the API creates when it starts, e.g. the first administrators (see "Administrator accounts" in `../README.md`)                     |

For each file there is a `<name>.example.json` here, which is committed and is the starting point. The real files
(`<name>.json`) can hold passwords, so they are **git-ignored** and kept out of Docker images; `npm run setup:backend`
creates `local-accounts.json` and `proposals.json` from their examples. To add another kind of file, put its example here and read it through
`src/config/configuration.ts`, so its default location follows `CONFIG_DIR`.
