# Module boundaries

Who may import whom inside `src/`. The rules live in `eslint/boundaries.js`
and run with `pnpm lint`; `pnpm arch:check` proves they still bite by linting
24 positive/negative fixtures (`scripts/architecture/fixtures`) with the real
configuration. Aliases (`components/Button`), relative paths, re-exports and
dynamic `import()` are resolved to files before checking, so none of them is
a way around a rule. Import cycles fail through `import/no-cycle`.

## Element types

Every top-level folder under `src/` has one type. A file in an unclassified
folder is an error: register new folders deliberately (here, in
`eslint/boundaries.js` and in the `paths` of `tsconfig.app.json`).

| Type         | Folder(s)                                                   | Role                                                         |
| ------------ | ----------------------------------------------------------- | ------------------------------------------------------------ |
| `config`     | `src/config`                                                | Validated configuration and build flags                      |
| `utils`      | `src/utils`                                                 | Pure helpers                                                 |
| `styles`     | `src/styles`                                                | Theme tokens, global styles, mixins                          |
| `assets`     | `src/assets`                                                | Fonts and static files                                       |
| `i18n`       | `src/i18n`                                                  | Locales, `useI18n`, formatting                               |
| `ui`         | `src/components`                                            | Domain-neutral primitives (receive data through props)       |
| `hooks`      | `src/hooks/*`                                               | Shared hooks; `useFlipLayout`, `useMediaQuery` are "neutral" |
| `data`       | `src/api`                                                   | HTTP client, errors, query client                            |
| `auth`       | `src/auth`                                                  | Auth contract, provider, adapters                            |
| `forms`      | `src/forms`                                                 | Form error messages and server-error mapping                 |
| `navigation` | `src/globals`, `src/flows`, `src/guards`                    | Paths, navigation context, flow contract, route guards       |
| `feature`    | `src/features/<name>`                                       | Product capabilities (one folder each)                       |
| `shell`      | `src/containers/Layouts`, `src/containers/RouteTransitions` | Page layouts and route transitions                           |
| `view`       | `src/views`                                                 | Route-level screens that compose everything                  |
| `demo`       | `src/demo`                                                  | Starter-only demo (removed on adoption)                      |
| `mocks`      | `src/mocks`                                                 | MSW reference API (dev, demo build, tests, stories)          |
| `test-utils` | `src/test`                                                  | Test helpers and setup                                       |
| `app`        | `src/containers` (everything else)                          | Composition root: providers, routers, adapters               |

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
| `auth`       | utils, config, data                                            |
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
  `@tanstack/react-query` or `msw`.
- **Neutral hooks** (used by shared UI) may not depend on navigation, config
  or i18n.
- **Production code never imports tests, stories, test utilities or mocks**
  (`msw` included). Exceptions: the composition root may import
  `mocks/browser.ts` (started only when `MOCKS_ENABLED`), and a feature's own
  `mocks/` files may use `src/mocks` helpers (faults).
- Tests and stories may import test utilities, `src/mocks` and feature mock
  entries.

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

1. Edit `eslint/boundaries.js` (the matrix is data, not code paths).
2. Add or adjust a fixture in `scripts/architecture/fixtures`: header
   `// @fixture-path src/<folder>/__arch__/<file>` plus `// @expect none` or
   `// @expect boundaries/dependencies: <message substring>`. Fixtures that
   need a feature import the throwaway `features/arch-fixture-feature`
   (copied from `scripts/architecture/support` for the run).
3. Run `pnpm arch:check` and `pnpm lint`, and update this page.
