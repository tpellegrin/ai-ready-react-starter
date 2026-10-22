# Module boundaries

Who may import whom inside `src/`. The rules live in `eslint/boundaries.js`
(plus a few in `eslint.config.js` and `eslint/plugin.js`) and run with
`pnpm lint`; `pnpm arch:check` proves they still bite by linting positive
and negative fixtures (`scripts/architecture/fixtures`) with the real
configuration. Aliases (`components/Button`), relative paths, re-exports and
dynamic `import()` are resolved to files before checking, so none of them is
a way around a rule. Import cycles fail through `import/no-cycle`.

## Element types

Every top-level folder under `src/` has one type. A file in an unclassified
folder is an error: register new folders deliberately (here, in
`eslint/boundaries.js` and in the `paths` of `tsconfig.app.json`).

| Type         | Folder(s)                                                                                   | Role                                                         |
| ------------ | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `config`     | `src/config`                                                                                | Validated configuration and build flags                      |
| `utils`      | `src/utils`                                                                                 | Pure helpers                                                 |
| `styles`     | `src/styles`                                                                                | Theme tokens, global styles, mixins                          |
| `assets`     | `src/assets`                                                                                | Fonts and static files                                       |
| `i18n`       | `src/i18n`                                                                                  | Locales, `useI18n`, formatting                               |
| `ui`         | `src/components/<Component>` (one element per component)                                    | Domain-neutral building blocks (receive data through props)  |
| `hooks`      | `src/hooks/*`                                                                               | Shared hooks; `useFlipLayout`, `useMediaQuery` are "neutral" |
| `data`       | `src/api`                                                                                   | HTTP client, errors, query client                            |
| `auth`       | `src/auth`                                                                                  | Auth contract, provider, adapters                            |
| `forms`      | `src/forms`                                                                                 | Form error messages and server-error mapping                 |
| `navigation` | `src/globals`, `src/flows`, `src/guards`                                                    | Paths, navigation context, flow contract, route guards       |
| `feature`    | `src/features/<name>`                                                                       | Product capabilities (one folder each)                       |
| `shell`      | `src/containers/Layouts/…`, `src/containers/RouteTransitions/…` (one element per component) | Page layouts and route transitions                           |
| `view`       | `src/views`                                                                                 | Route-level screens that compose everything                  |
| `demo`       | src/demo (starter only)                                                                     | Starter-only demo (removed on adoption)                      |
| `mocks`      | `src/mocks`                                                                                 | MSW reference API (dev, demo build, tests, stories)          |
| `test-utils` | `src/test`                                                                                  | Test helpers and setup                                       |
| `app`        | `src/containers` (everything else)                                                          | Composition root: providers, routers, adapters               |

## Import matrix

A type may always import its own type (except features, see below), plus:

| From         | May import                                                     |
| ------------ | -------------------------------------------------------------- |
| `config`     | utils                                                          |
| `styles`     | utils, assets, neutral hooks                                   |
| `i18n`       | utils, config                                                  |
| `ui`         | utils, config, i18n, styles, assets, neutral hooks             |
| `hooks`      | infra (utils, config, i18n, styles, assets), hooks, navigation |
| `data`       | utils, config, i18n                                            |
| `auth`       | utils, config, i18n, data                                      |
| `forms`      | utils, config, i18n, data                                      |
| `navigation` | utils, config, i18n, auth                                      |
| `feature`    | the platform: infra, ui, hooks, data, auth, forms, navigation  |
| `shell`      | infra, ui, hooks, navigation                                   |
| `view`       | platform, shell, feature (public API)                          |
| `demo`       | platform, shell, feature, view                                 |
| `app`        | platform, shell, feature, view, demo                           |
| `mocks`      | utils, config, data, auth, feature mock entries                |
| `test-utils` | everything                                                     |

Overrides on top of the matrix:

- **Shared layers never depend on features**, not even their public API.
  Pass data or components in from a view.
- **Shared UI does not fetch:** `src/components` may not import
  `@tanstack/react-query` or `msw`, and no production code outside
  `src/api/http` calls `fetch`, `XMLHttpRequest`, `WebSocket`,
  `EventSource` or `navigator.sendBeacon` (`no-restricted-globals` /
  `-properties` in `eslint.config.js`).
- **Browser storage** (`localStorage`, `sessionStorage`, `indexedDB`,
  `document.cookie`) is allowed only in auth adapters, the i18n provider
  (language preference), mocks and tests. Extend the allow-list in
  `eslint.config.js` deliberately, with a reason.
- **Neutral hooks** (used by shared UI) may not depend on navigation, config
  or i18n.
- **Production code never imports tests, stories, test utilities or mocks**
  (`msw` included). Exceptions: the composition root may import
  `mocks/browser.ts` (started only when `MOCKS_ENABLED`), and a feature's own
  `mocks/` files may use `src/mocks` helpers (faults).
- Tests and stories may import test utilities, `src/mocks` and feature mock
  entries.

## Components: public API and internals

A shared component or layout is a folder with an `index.ts(x)`; that file
is its **public API**. Everything else in the folder — `styles.ts` with its
internal `_<Component><Part>` elements, `logic.ts`, helpers, `types.ts` — is
private. From another folder, import only the index (types included: the
index re-exports what is public, e.g. `export type { BoxProps }`).
Grouping folders (`Form`, `Animations`, `Layouts/common`, `Layouts/Shells`)
are not components; loose modules directly inside them (e.g.
`Layouts/common/helpers.tsx`) are shared by that group.

Everywhere in `src/` (features and views included), `_` elements are
imported only from `./styles` in their own folder and are never re-exported
(`starter/no-internal-styled-imports`); styled elements are named after
their folder (`starter/styled-element-names`); local `export *` is replaced
by explicit exports. Rationale and examples:
[ui/foundation](../ui/foundation.md#public-components-and-internals).

## Features

```
src/features/<name>/
  index.ts          public API (the only import path from outside)
  model.ts          Zod schemas, types, parsing of URL/user input
  api.ts            endpoint calls through apiClient, each with a schema
  queries.ts        feature-owned query keys, queryOptions, mutations
  components/<X>/   index.tsx (rendering) + logic.ts (state, data, handlers)
  mocks/            fixtures, MSW handlers; mocks/index.ts is the mock entry
```

- Outside the feature, import only `features/<name>` (its `index.ts`).
- Inside the feature, import modules directly, never through its own
  `index.ts` (that is how cycles start).
- Features never import other features. Compose them in a view; if two
  features need the same code, it belongs in a shared layer.
- Feature mock entries (`features/<name>/mocks`) are registered in
  `src/mocks/handlers.ts`.

`pnpm gen feature <name>` scaffolds this layout (see
[recipes/new-feature.md](../recipes/new-feature.md)).

## Changing the rules

1. Edit `eslint/boundaries.js` (the matrix is data, not code paths), or the
   restricted APIs in `eslint.config.js`.
2. Add or adjust a fixture in `scripts/architecture/fixtures`: header
   `// @fixture-path src/<folder>/__arch__/<file>` plus `// @expect none` or
   `// @expect <rule>: <message substring>` (`// @lint stylelint` for
   Stylelint rules). Fixtures that need a feature, a shared component or
   demo code use throwaway ones from
   `scripts/architecture/support/<area>/<name>`
   (`features/arch-fixture-feature`, `components/ArchFixtureWidget`,
   `demo/ArchFixtureDemo`), copied into `src/` for the run. Never point a
   fixture at code that adoption removes: the check must pass in adopted
   projects too.
3. Run `pnpm arch:check` and `pnpm lint`, update this page, and record an
   architecture change in an ADR (`docs/decisions/README.md`).
