# Guardrails

Every rule this starter relies on is enforced by a command, not by memory.
This page maps each invariant to the check that fails when it is broken.
`pnpm verify` runs all of them locally; CI runs the same commands in parallel
jobs (`.github/workflows/ci.yml`), and none of them is allowed to fail.

## Commands

| Command                                | What it runs                                                                                                     | CI job        |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------- |
| `pnpm validate`                        | Prettier check, ESLint (`--max-warnings=0`), Stylelint, `tsc -b`, i18n checks, architecture fixtures, unit tests | `validate`    |
| `pnpm test:cov`                        | Unit tests with coverage floors (global and per module)                                                          | `coverage`    |
| `pnpm audit --prod`                    | Advisories in runtime dependencies (`--audit-level=high` in CI)                                                  | `audit`       |
| `pnpm build` + `check:build`           | Real build, then budgets, code splitting and forbidden-content inspection                                        | `build`       |
| `pnpm build:demo` + `check:build:demo` | Demo build (MSW worker present, demo code lazy)                                                                  | `build`       |
| `pnpm test:storybook`                  | Every story in Chromium: play functions + axe (violations fail)                                                  | `storybook`   |
| `pnpm storybook:build`                 | Static catalog builds (uploaded as an artifact)                                                                  | `storybook`   |
| `pnpm test:e2e`                        | Playwright against built apps: demo at root and sub-path, real build with mocked API; axe on key pages           | `e2e`         |
| `pnpm gen:check`                       | Generator safety + generated feature passes every gate (temporary copy)                                          | `scaffolding` |
| `pnpm adopt:check`                     | Adoption scenarios pass every gate (temporary copies)                                                            | `scaffolding` |

## Invariants

| Invariant                                                                                           | Enforced by                                                                                              | Where                                               |
| --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| One Node/pnpm baseline (Node 24 LTS, pnpm 9.15.9)                                                   | `engines` + `engine-strict`, `packageManager`, CI reads `.nvmrc`                                         | `package.json`, `.npmrc`, `.nvmrc`                  |
| Lockfile matches `package.json`                                                                     | `pnpm install --frozen-lockfile` in every CI job                                                         | `.github/actions/setup`                             |
| Strict types (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`) for app, tests, tooling     | `pnpm typecheck` (`tsc -b` over three projects)                                                          | `tsconfig.*.json`                                   |
| No unsafe `any` flows, floating/misused promises, explicit `any`, hook dependency mistakes          | ESLint type-aware rules as errors; `void promise` does not silence a floating promise                    | `eslint.config.js`                                  |
| No warnings accumulate                                                                              | `--max-warnings=0` for ESLint and Stylelint                                                              | `package.json` scripts                              |
| `import.meta.env` is read only in `src/config`; no `process.env` in browser code                    | `no-restricted-syntax`                                                                                   | `eslint.config.js`                                  |
| Dev dependencies (MSW, testing libraries, Storybook) never imported by production code              | `import/no-extraneous-dependencies` + boundary rules                                                     | `eslint.config.js`, `eslint/boundaries.js`          |
| Layer matrix (shared UI ↛ features/navigation/views, features isolated, public API only, no cycles) | `eslint-plugin-boundaries`, `import/no-cycle`; 24 positive/negative fixtures prove the rules bite        | `eslint/boundaries.js`, `pnpm arch:check`           |
| Unknown top-level `src/` folders are classified deliberately                                        | Boundary rule for unclassified files                                                                     | `eslint/boundaries.js`                              |
| Configuration is valid; demo auth and mocks are impossible in a real production build               | Zod schema run by `vite.config.ts` (dev server, build, tests) and at runtime                             | `src/config/schema.ts`                              |
| Real builds contain no demo/mock/MSW/test/story code and no source maps                             | Module report inspection                                                                                 | `pnpm check:build`                                  |
| Bundle stays within budget; routes that must be lazy stay lazy                                      | Gzip budgets and initial-graph check                                                                     | `scripts/check-build.mjs`                           |
| Assets resolve under the deployment base path                                                       | `index.html` URL check (`--base`), sub-path e2e project                                                  | `pnpm check:build`, `e2e/demo/smoke.spec.ts`        |
| Every locale has the same keys; literal keys exist; pseudo-locale is current                        | `pnpm i18n:check`                                                                                        | `scripts/i18n-check.mjs`, `scripts/i18n-pseudo.mjs` |
| Typed translation keys                                                                              | `I18nKey` type in `t()`                                                                                  | `src/i18n/index.ts`                                 |
| Tests never hit the network or an unknown endpoint                                                  | MSW server fails the test on any unhandled request                                                       | `src/test/setup.ts`                                 |
| Coverage does not regress                                                                           | Global floors + stricter per-module floors (api, auth, config, forms, routing/guards, reference feature) | `vitest.config.ts`                                  |
| Components are accessible (labels, names, roles, contrast, focus)                                   | axe in every story test and on e2e pages; jsdom tests for focus behavior                                 | `.storybook/preview.tsx`, `e2e/fixtures.ts`         |
| Motion respects `prefers-reduced-motion`                                                            | e2e motion check (with a control test proving it measures something)                                     | `e2e/demo/accessibility.spec.ts`                    |
| Runtime errors cannot hide behind passing e2e assertions                                            | Every e2e test fails on page errors and console errors                                                   | `e2e/fixtures.ts`                                   |
| Flaky e2e tests are failures                                                                        | `failOnFlakyTests` on CI                                                                                 | `playwright.config.ts`                              |
| Generated code follows the conventions                                                              | Generated feature must pass typecheck, lint, Stylelint, Prettier, i18n and its tests                     | `pnpm gen:check`                                    |
| Removing the demo/reference code leaves a working project                                           | Three adoption scenarios must pass every gate                                                            | `pnpm adopt:check`                                  |
| Runtime dependencies have no known high advisories                                                  | `pnpm audit --prod --audit-level=high`                                                                   | CI `audit` job, `SECURITY.md`                       |
| Commit messages are single-line Conventional Commits                                                | commitlint (husky `commit-msg`)                                                                          | `commitlint.config.cjs`                             |

## When a check fails

Fix the cause. Do not lower a threshold, raise a budget, add a lint
suppression or skip a test to make a change pass. If a limit genuinely needs
to move (a new dependency, a deliberate feature), change it in the same
change that explains why — budgets and floors carry that instruction in their
comments, and `SECURITY.md` lists the only accepted advisories.

Adding a check? Add it to `pnpm verify`, to CI, and to this page.
