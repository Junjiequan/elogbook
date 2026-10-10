# Colours

Use these as CSS variables, e.g. `var(--mat-sys-surface)` or
`color-mix(in srgb, var(--mat-sys-primary) 10%, transparent)`. Do not write hex values in a component.

## Changing a colour

| To change                                     | Do this                                                                                                         |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| one token                                     | add it to `mat.theme-overrides(...)` in `src/styles.scss`, e.g. `outline-variant: light-dark(#c9d1dc, #34465c)` |
| a whole family (primary, secondary, tertiary) | change the palettes in `src/theme/_ess-colors.scss` (regenerate, do not hand-edit)                              |
| brand or app-level                            | edit the `--ess-*` and `--app-*` lines in `src/styles.scss`                                                     |

The values below are what the app resolves today. If you change a colour, update this table too.

## Surfaces (backgrounds)

| Variable `--mat-sys-…`      | Light     | Dark      | Use for                    |
| --------------------------- | --------- | --------- | -------------------------- |
| `surface`, `background`     | `#ffffff` | `#0b1522` | page and card background   |
| `surface-container-low`     | `#f5f6f8` | `#101c2c` | slightly raised areas      |
| `surface-container`         | `#edf0f4` | `#152438` | hover fills, chips, counts |
| `surface-container-high`    | `#e6eaef` | `#1c2e45` |                            |
| `surface-container-highest` | `#e1e4ea` | `#25394f` |                            |
| `surface-variant`           | `#dae4ee` | `#3e4850` |                            |

## Text and lines

| Variable `--mat-sys-…` | Light     | Dark      | Use for                         |
| ---------------------- | --------- | --------- | ------------------------------- |
| `on-surface`           | `#1b1c1c` | `#e3e2e2` | normal text                     |
| `on-surface-variant`   | `#3e4850` | `#dae4ee` | secondary text, icons           |
| `outline`              | `#6f7881` | `#88929b` | strong borders, placeholders    |
| `outline-variant`      | `#bec8d2` | `#3e4850` | hairlines, card and bar borders |

## Accent families

Each fill has an `on-…` colour: the text colour to use on top of it.

| Variable `--mat-sys-…`                           | Light                 | Dark                  |
| ------------------------------------------------ | --------------------- | --------------------- |
| `primary` / `on-primary`                         | `#006492` / `#ffffff` | `#8bceff` / `#00344e` |
| `primary-container` / `on-primary-container`     | `#c9e6ff` / `#004b6f` | `#004b6f` / `#c9e6ff` |
| `secondary` / `on-secondary`                     | `#3a5f94` / `#ffffff` | `#a7c8ff` / `#003061` |
| `secondary-container` / `on-secondary-container` | `#d5e3ff` / `#1f477b` | `#1f477b` / `#d5e3ff` |
| `tertiary` / `on-tertiary`                       | `#0d6c4b` / `#ffffff` | `#85d7af` / `#003825` |
| `tertiary-container` / `on-tertiary-container`   | `#a0f4ca` / `#005137` | `#005137` / `#a0f4ca` |
| `error` / `on-error`                             | `#ba1a1a` / `#ffffff` | `#ffb4ab` / `#690005` |
| `error-container` / `on-error-container`         | `#ffdad6` / `#93000a` | `#93000a` / `#ffdad6` |
| `inverse-surface` / `inverse-on-surface`         | `#303031` / `#f2f0f0` | `#e3e2e2` / `#303031` |
| `inverse-primary`                                | `#8bceff`             | `#006492`             |

## Brand and app (defined in `src/styles.scss`)

| Variable                                         | Value                           | Use for                                                 |
| ------------------------------------------------ | ------------------------------- | ------------------------------------------------------- |
| `--ess-cyan`                                     | `#0099dc`                       | ESS Cyan                                                |
| `--ess-navy`                                     | `#003366`                       | ESS Navy                                                |
| `--ess-grass`                                    | `#99be00`                       | ESS Grass                                               |
| `--ess-forest`                                   | `#006646`                       | ESS Forest                                              |
| `--ess-orange`                                   | `#ff7d00`                       | ESS Orange                                              |
| `--ess-purple`                                   | `#821482`                       | ESS Purple                                              |
| `--app-bg`                                       | gradient                        | page background                                         |
| `--app-brand-bg`                                 | `#003366` light, `#001f3d` dark | header and footer                                       |
| `--app-brand-accent`                             | `#0099dc`                       | accent line                                             |
| `--app-brand-text`                               | `#ffffff`                       | text on the header and footer                           |
| `--app-shadow-sm`, `-md`, `-lg`, `-pop`, `-side` |                                 | shadow scale (tinted navy, black in dark mode)          |
| `--app-shadow-rgb`, `--app-shadow-strength`      |                                 | for a custom shadow: `rgb(var(--app-shadow-rgb) / 20%)` |
