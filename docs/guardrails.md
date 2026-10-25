# Guardrails

Which invariant is enforced by which check, what each check cannot see, and
what still needs a reviewer. `pnpm verify` runs every check locally; CI runs
the same package scripts as parallel jobs (`.github/workflows/ci.yml`), all
required. `pnpm docs:check` fails when the two drift apart.

## Commands

| Command                                        | Runs                                                                                                                                                                                                                                                                                                   | CI job                                      |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------- |
| `pnpm validate`                                | format, lint (ESLint + boundaries + project rules), Stylelint, types, translations, docs, architecture fixtures, composition plans, tooling and unit tests                                                                                                                                             | `validate`                                  |
| `pnpm audit --prod --audit-level=high`         | advisories in runtime dependencies                                                                                                                                                                                                                                                                     | `audit`                                     |
| `pnpm test:cov`                                | unit tests with coverage floors                                                                                                                                                                                                                                                                        | `coverage`                                  |
| `pnpm build` + `pnpm check:build`              | real build; budgets, lazy routes, no demo/mock/test code or source maps, base path                                                                                                                                                                                                                     | `build`                                     |
| `pnpm test:storybook` + `pnpm storybook:build` | every story in Chromium and WebKit (play functions, axe); static catalog                                                                                                                                                                                                                               | `storybook`                                 |
| `pnpm test:e2e`                                | built apps in desktop Chromium and mobile WebKit, the dev server under Strict Mode (and the starter's demo builds)                                                                                                                                                                                     | `e2e`                                       |
| `pnpm design:regress`                          | composition plans' regression scenarios against their reviewed baselines (`design/<task>/baselines`); a missing baseline fails, nothing is written                                                                                                                                                     | `e2e`                                       |
| `pnpm gen:check`                               | every generator: refusals, dry runs, registrations, generated code passes the gates (temporary copy)                                                                                                                                                                                                   | `generator`                                 |
| `pnpm adopt:check`                             | adoption scenarios, each followed by the adopted project's own `pnpm verify` (temporary copies); `product` adds a form and a browser journey to generated code; `design` builds two pages from reference images and proves the design tooling. Starter only: `pnpm adopt` removes the step and the job | `adoption` (one per scenario; starter only) |

`pnpm verify` runs them all and prints one line per check; failures show
their problems as `file:line rule message` with the full log path, and
`reports/verify/report.json` records every step. Useful options: `--only`,
`--skip`, `--bail`, `--json`, `--list`, and `--affected [--base <ref>]`,
which picks a conservative subset for the current diff and says what it
skipped and why:

- Tooling, configuration, dependencies, a deleted or renamed asset, or a
  file type it does not classify: everything.
- Production code, locales or assets: the builds, every Storybook story
  (which stories a change reaches cannot be told from folders: stories
  render shared components, and the preview loads providers, copy, fonts
  and every feature's mocks) and the end-to-end tests. Assets also rebuild
  Storybook and are never passed to Prettier.
- Unit tests: `vitest related` (the real module graph); all of them for
  locales, deletions or shared test infrastructure. ESLint is narrowed only
  for tests, stories and e2e files; production code re-lints everything
  (type-aware rules re-check importers).
- Stories alone: only those stories.
- Composition plans, their reference images and baselines (`design/`): the
  plan check and the design regression check (which also follow production
  code and e2e changes); images are never passed to Prettier. Other files
  under `design/` select everything.

`--affected` is for iterating; merge readiness is `pnpm verify` and CI.

Browsers: `pnpm exec playwright install chromium webkit`.

## Invariants

| Invariant                                                                                                                                   | Enforced by                                                                                                                                                                      | Where                                                                        |
| ------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| One Node/pnpm baseline; lockfile matches `package.json`                                                                                     | `engines` + `engine-strict`, `packageManager`, `--frozen-lockfile` in CI                                                                                                         | `package.json`, `.npmrc`, `.github/actions/setup`                            |
| Strict types for app, tests and tooling                                                                                                     | `tsc -b` over three projects                                                                                                                                                     | `tsconfig.*.json`                                                            |
| No unsafe `any`, floating or misused promises; `void promise` is not handling                                                               | type-aware ESLint (errors); fixture `floating-promise-void`                                                                                                                      | `eslint.config.js`                                                           |
| Layer matrix: shared layers never depend on features, views or the app shell; no cycles                                                     | `boundaries/dependencies`, `import/no-cycle`; positive and negative fixtures                                                                                                     | `eslint/boundaries.js`, `pnpm arch:check`                                    |
| Features are imported only through `index.ts` and never import each other (aliases, relative paths, re-exports, `import()`)                 | `boundaries/dependencies`; fixtures                                                                                                                                              | same                                                                         |
| Shared components and layouts are used through their `index`; `_` styled elements stay in their folder                                      | `boundaries/dependencies` (component elements), `starter/no-internal-styled-imports`; fixtures                                                                                   | `eslint/boundaries.js`, `eslint/plugin.js`                                   |
| Styled elements are named `_<Component><Part>`, live in `styles.ts`, are imported by name; exports are explicit (no local `export *`)       | `starter/styled-element-names`, `no-restricted-imports` (styled outside styles), `no-restricted-syntax`; fixtures                                                                | `eslint.config.js`, `eslint/plugin.js`                                       |
| Shared UI never fetches; requests go through `apiClient`                                                                                    | boundaries (`@tanstack/react-query`, `msw` in UI), `no-restricted-globals`/`-properties` for `fetch`, XHR, WebSocket, EventSource, `sendBeacon` outside `src/api/http`; fixtures | `eslint.config.js`                                                           |
| Browser storage (`localStorage`, `sessionStorage`, `indexedDB`, `document.cookie`) only in auth adapters, the language preference and mocks | `no-restricted-globals`/`-properties` with an allow-list; fixtures                                                                                                               | `eslint.config.js`                                                           |
| Production code never imports demo, tests, stories, test utilities or mocks                                                                 | boundaries, `import/no-extraneous-dependencies`; fixtures; `check:build` inspects the shipped modules                                                                            | `eslint/boundaries.js`, `scripts/check-build.mjs`                            |
| Configuration is read only in `src/config`; invalid combinations cannot build                                                               | `no-restricted-syntax`; Zod schema in `vite.config.ts` and at runtime; fixture `reads-import-meta-env`                                                                           | `src/config/schema.ts`                                                       |
| Architecture and safety rules are not suppressed inline                                                                                     | `starter/no-protected-suppression`, re-run by `arch:check` with inline config off (a blanket disable cannot hide itself)                                                         | `eslint/plugin.js`, `scripts/architecture/check.mjs`                         |
| Colors come from the theme; no stylesheets or other styling systems; no `transition: all` or inline transitions                             | Stylelint (`color-no-hex`, `color-named`, color functions, transition values); `no-restricted-imports`/`-syntax`; fixtures                                                       | `.stylelintrc.cjs`, `eslint.config.js`                                       |
| Every locale has the same keys and `{placeholders}`; literal keys exist; pseudo-locale current; keys typed                                  | `pnpm i18n:check` (+ `I18nKey` in `t()`)                                                                                                                                         | `scripts/i18n-check.mjs`, `scripts/lib/i18n.mjs`                             |
| Flow ids match their URL segment; step paths unique, ordered, routed; every `/flow/` route declared                                         | `validateFlowContract` on the real paths and routes (`pnpm test:run`)                                                                                                            | `src/flows/contract.ts`, `src/containers/routing/flowContract.test.ts`       |
| Docs reference existing files, headings and scripts; verify and CI agree                                                                    | `pnpm docs:check`                                                                                                                                                                | `scripts/check-docs.mjs`                                                     |
| Tests never hit the network or an unknown endpoint                                                                                          | MSW fails the test on any unhandled request                                                                                                                                      | `src/test/setup.ts`                                                          |
| Coverage does not regress                                                                                                                   | global and per-module floors                                                                                                                                                     | `vitest.config.ts`                                                           |
| Session ordering, deadlines and failure policy                                                                                              | unit tests (races, adapter replacement, unmount, Strict Mode, timeouts, 401 policy)                                                                                              | `src/auth`, `src/containers/session`                                         |
| Components are accessible (names, roles, contrast, focus, WCAG 2.2 target size)                                                             | axe in every story (Chromium, WebKit) and on key pages (desktop and mobile)                                                                                                      | `.storybook/preview.tsx`, `e2e/fixtures.ts`                                  |
| Flow transitions settle and keep focus in the page, also under Strict Mode                                                                  | unit tests with and without Strict Mode; e2e on built apps and the dev server                                                                                                    | `src/containers/RouteTransitions`, `e2e/production/flows.spec.ts`, `e2e/dev` |
| Motion respects `prefers-reduced-motion` (≤ 100 ms)                                                                                         | e2e measurement with a control test                                                                                                                                              | `e2e/production/accessibility.spec.ts`                                       |
| Runtime errors cannot hide behind passing e2e assertions; flaky tests fail                                                                  | page/console errors fail every e2e test (exempt: exact engine notices about deliberate markup, `ENGINE_NOTICES`); `failOnFlakyTests` on CI                                       | `e2e/fixtures.ts`, `playwright.config.ts`                                    |
| Bundle stays within budget; listed routes stay lazy; assets resolve under the base path                                                     | gzip budgets, initial-graph check, `index.html` URL check                                                                                                                        | `scripts/check-build.mjs`                                                    |
| Reference images, plans and evidence never ship                                                                                             | `check:build` refuses modules from `design/` or `reports/`                                                                                                                       | `scripts/check-build.mjs`                                                    |
| Composition plans are valid, match the images they were written from and map regions to real public exports, never internals                | `pnpm design:check` (read-only; schema, hashes, cross-references, catalog facts, name collisions); tests with fixtures                                                           | `scripts/lib/design/check.mjs`                                               |
| Reviewed design baselines still match; missing ones fail; baselines are written only on request                                             | `pnpm design:regress` (Playwright snapshots, default thresholds, per platform)                                                                                                   | `playwright.design.config.ts`, `e2e/design/capture.spec.ts`                  |
| Generated code follows the conventions; generators stay usable after adoption                                                               | `pnpm gen:check`; the adoption scenarios run it again                                                                                                                            | `scripts/check-generator.mjs`                                                |
| Removing demo/reference code — and building a product on top — leaves a working project with accurate docs                                  | `pnpm adopt:check` (demo, reference, both, product, design; starter only, refused after adoption)                                                                                | `scripts/check-adoption.mjs`                                                 |
| Runtime dependencies have no known high advisories                                                                                          | `pnpm audit --prod --audit-level=high`                                                                                                                                           | CI `audit`, `SECURITY.md`                                                    |
| Commit messages are single-line Conventional Commits                                                                                        | commitlint (husky `commit-msg`)                                                                                                                                                  | `commitlint.config.cjs`                                                      |

## Not machine-checked: review these

The checks above are narrow on purpose. Reviewers (and agents) still own:

- **Product judgment:** whether a new shared component was needed at all,
  or whether an existing one (`pnpm catalog`) or a local wrapper would do;
  whether code belongs in a feature or a shared layer.
- **Domain neutrality of the starter** (in starter-maintenance mode) and of
  shared layers in a product.
- **Logic separation:** meaningful state, derived values and handlers in
  `logic.ts`; tiny presentational components without one.
- **Theme usage beyond colors:** spacing, typography and radii from tokens
  (structural sizes such as `max-width: 40rem` are fine); `Box` only as a
  visible surface.
- **Design fidelity:** whether a page matches its reference images. The
  design checks prove facts and structure (regions present, arrangement,
  containment); the agent records what it saw, and only a person sets
  `review.human` in a plan.
- **Accessibility beyond axe:** keyboard paths, focus order and focus
  return, announcements, sensible headings and labels. axe finds a subset of
  problems; it is not proof of accessibility.
- **Performance beyond budgets:** budgets catch size regressions, not slow
  renders or waterfalls.
- **Security and authorization:** the server authorizes every request; the
  client cannot.
- **Copy quality and translations** (the checks only prove the keys and
  placeholders exist).
- **Dynamic translation keys** (built from variables) are only type-checked
  when they come from a typed map.

## When a check fails

Fix the cause; the diagnostic names the approved alternative. Do not lower
a threshold, raise a budget, skip a test, disable Strict Mode or add a
suppression to make a change pass. Protected rules cannot be disabled inline
at all; other inline disables need a reason after `--`.

## Evolving limits deliberately

Products grow: budgets, coverage floors, rules and contracts are expected to
change — reviewably, never to hide a failure.

- **Budgets** (`scripts/check-build.mjs`): raise one in the change that
  adds the weight, with the measured sizes and the reason in the commit and
  a comment next to the number (e.g. "charts library, lazy on /reports").
  After adoption they are the product's budgets; measuring and changing
  them: [adoption](adoption.md#6-own-the-performance-budgets).
- **Coverage floors** (`vitest.config.ts`): raise them as coverage grows.
  Lowering one needs a stated reason (code removed with its tests, a module
  moved) and an equivalent protection where the risk moved.
- **Boundary and lint rules:** change `eslint/boundaries.js` or
  `eslint.config.js` together with a fixture that proves the new rule, the
  docs, and an ADR when it changes the architecture
  (`docs/decisions/README.md`).
- **Contracts** (auth adapter, HTTP client, flow paths, generators): update
  the contract's tests, the recipe and `docs/migration-notes.md`.

Adding a check: add it to `pnpm verify` (`scripts/lib/verify-steps.mjs`),
to CI, and to this page; give it positive and negative fixtures or tests and
a diagnostic that says how to fix the problem. A check that only the
starter can pass (like the adoption check) goes between
`starter:maintenance` markers in both places, so adoption removes it.
