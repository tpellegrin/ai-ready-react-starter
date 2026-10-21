# Starter upgrade plan

Evidence-based plan for turning this repository into a compact, production-oriented
React SPA foundation. It records the baseline, the gaps, the dependency decisions,
and the milestone checkpoints. Keep the **Checkpoint log** current so work can be
resumed after an interruption.

## Baseline (2026-10-20, commit `9a5e655`)

Environment: macOS, Node 24.21.0 (also compared on 20.20.2 and 22.23.3), pnpm 9.15.9
through Corepack (`packageManager` pin). Working tree was clean.

| Command                             | Result                                           | Notes                                                                                                                                                                                                                                 |
| ----------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm install --frozen-lockfile`    | **fails**                                        | `ERR_PNPM_OUTDATED_LOCKFILE`: lockfile still lists `react-router`, `@types/styled-components`, `eslint-config-airbnb*`. Both workflows install with `--frozen-lockfile`, so CI could not pass.                                        |
| `pnpm install --no-frozen-lockfile` | passes                                           | Peer warning: `stylelint-a11y` wants stylelint ≤13 (16 installed); it is not referenced by `.stylelintrc.cjs`.                                                                                                                        |
| `pnpm format:check`                 | passes                                           | Only `js/json/ts/tsx` are checked; Markdown/YAML/CJS are not.                                                                                                                                                                         |
| `pnpm lint` (`eslint src`)          | passes                                           | Warnings allowed; configs/scripts not linted; every `no-unsafe-*`, `no-floating-promises`, `no-misused-promises` rule disabled; `exhaustive-deps` and `no-explicit-any` are warnings.                                                 |
| `pnpm lint:css`                     | passes                                           |                                                                                                                                                                                                                                       |
| `pnpm typecheck` (`tsc --noEmit`)   | passes                                           | Uses the loose root config (`moduleResolution: node`, `baseUrl`).                                                                                                                                                                     |
| `tsc -p tsconfig.app.json`          | **472 errors**                                   | The strict config ESLint uses for type info cannot resolve `components/…` aliases (280 × TS2307), plus 79 `verbatimModuleSyntax`, 74 missing Vitest globals, 2 `erasableSyntaxOnly` enums. Type-aware lint therefore saw error types. |
| `pnpm i18n:check`                   | passes                                           |                                                                                                                                                                                                                                       |
| `pnpm test:run` on Node 24          | **3 failed / 56 passed**, 3 unhandled rejections | `RequestInit: Expected signal … to be an instance of AbortSignal`: Vitest's jsdom env swaps in jsdom's `AbortSignal` while React Router builds a native undici `Request`.                                                             |
| `pnpm test:run` on Node 20 / 22     | 59 passed                                        | The failures are Node-24-specific (stricter undici brand check).                                                                                                                                                                      |
| `pnpm test:cov`                     | **fails**                                        | `@vitest/coverage-v8` is not installed; no coverage config.                                                                                                                                                                           |
| `pnpm build`                        | passes                                           | One 431 kB JS chunk (137 kB gzip), three 343 kB TTF fonts. No env validation; mocks/demo are always bundled.                                                                                                                          |

## Gap table

Priority: **P0** blocks trustworthy CI or is a correctness/security defect; **P1** is a
required capability from the brief; **P2** is hardening/ergonomics.

| #   | Current evidence                                                                                                                                                                                                                                | Intended change                                                                                                                                                                                            | Pri | Acceptance check                                                                                                           |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- | -------------------------------------------------------------------------------------------------------------------------- |
| 1   | Stale lockfile; `engines: >=20` (Node 20 is EOL since 2026-04-30); CI hardcodes Node 20.                                                                                                                                                        | Node 24 LTS baseline in `.nvmrc`, `engines`, CI (`node-version-file`), docs; regenerate lockfile; remove unused deps.                                                                                      | P0  | `pnpm install --frozen-lockfile` succeeds on a clean clone with Node 24.                                                   |
| 2   | Three tsconfigs disagree; strict app config is unused and broken; config files untyped.                                                                                                                                                         | Shared `tsconfig.base.json`; `app`, `test`, `node` projects with explicit scopes and one alias map; solution-style root; enable `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`.                  | P0  | `pnpm typecheck` (`tsc -b`) checks app, tests, and tooling files with the same aliases Vite/Vitest/ESLint use.             |
| 3   | Type-aware lint rules off; warnings allowed; configs not linted.                                                                                                                                                                                | Enable unsafe-boundary, promise, `no-explicit-any`, hook-deps rules as errors; fix findings; lint the whole repo with `--max-warnings=0`.                                                                  | P0  | `pnpm lint` exits 0 with zero warnings; deliberately unsafe code fails.                                                    |
| 4   | Node 24 test failures; no coverage provider.                                                                                                                                                                                                    | Custom Vitest environment that keeps Node's fetch/abort globals under jsdom; add coverage provider + thresholds from the measured baseline.                                                                | P0  | `pnpm test:run` green on Node 24 with no unhandled errors; `pnpm test:cov` runs non-interactively and enforces thresholds. |
| 5   | `define: { 'process.env': {} }`, `process.env.NODE_ENV` checks in browser code, `rollupOptions.external: /mocks/`, `optimizeDeps.exclude: js-big-decimal`, `cache: false`, legacy `.storybook`/`babel` tsconfig entries, `jest` in lint-staged. | Remove obsolete options; use `import.meta.env`/injectable config.                                                                                                                                          | P1  | Grep finds no `process.env` in `src/`; build and tests pass.                                                               |
| 6   | `VITE_APP_NAME`, `VITE_API_BASE_URL`, `VITE_ENABLE_MOCKS` documented but unused.                                                                                                                                                                | One Zod-validated config entry (`src/config`) shared by runtime and `vite.config.ts`; strict booleans; URL validation; clear diagnostics.                                                                  | P1  | Unit tests for parsing; invalid env fails `vite build` with a readable message.                                            |
| 7   | `AuthProvider` hardwires `createMockAuthAdapter`; a production build signs in the mock user.                                                                                                                                                    | Adapter injected from the composition root; demo adapter only behind the explicit demo mode; reference HTTP session adapter for real builds.                                                               | P0  | Non-demo build contains no demo adapter code; invalid combinations fail at build time.                                     |
| 8   | Guest router includes onboarding routes (DemoHub link); `Complete` calls `switchRouter(user)` imperatively.                                                                                                                                     | Router type derived from auth state during render; guest onboarding preview only in demo mode; flow exit through auth state.                                                                               | P0  | Test: a guest cannot reach onboarding or user routes in non-demo mode; e2e covers protected-route denial.                  |
| 9   | Unknown routes silently redirect to `/`; deep links to protected pages lose their destination after sign-in.                                                                                                                                    | Deliberate unknown-route policy (NotFound page) and a safe `returnTo` hand-off across the router swap.                                                                                                     | P1  | Characterization test reproduces the loss, then passes after the fix; e2e deep-link refresh/back-forward.                  |
| 10  | `restoreSession().finally(...)` leaks rejections; adapter state mirrored through a `tick` counter; no cache isolation.                                                                                                                          | Provider owns auth state; adapters return results; stale/late results ignored; restore failure shows a recoverable error; query cache cancelled/cleared on identity change.                                | P0  | Tests: restore rejection, late sign-in/out results, adapter change, logout with an in-flight request.                      |
| 11  | `demoApi` fakes latency with `setTimeout` and `process.uptime`; global `queryKeys` registry.                                                                                                                                                    | Thin fetch HTTP client (base URL, headers, AbortSignal, empty bodies, normalized errors, per-request Zod schemas); feature-owned keys/options; bounded retry policy.                                       | P1  | Tests for HTTP/empty/abort/non-JSON/schema failures; MSW-backed integration tests.                                         |
| 12  | No schema library, no form library, placeholder-labelled inputs.                                                                                                                                                                                | Zod for config/payloads/forms; React Hook Form + resolver; `Field` composition with labels, descriptions, errors, ARIA wiring.                                                                             | P1  | Form tests: client errors, server 422 errors, focus on first error, pending, reset.                                        |
| 13  | No MSW; mocks are in-memory functions.                                                                                                                                                                                                          | MSW 3 handlers owned by the reference feature; Node server in tests (unhandled requests fail); browser worker only in dev/demo, served under the base path.                                                | P1  | Unexpected request fails a test; production build has no worker file or MSW code.                                          |
| 14  | No import rules; `components/` and `hooks/` import transition types from `containers/`; route-transition shells live in `components/`.                                                                                                          | `src/features/<feature>` convention; ESLint boundary rules + cycle check; neutral motion contracts moved to `utils/transitions`; shells moved to `containers/RouteTransitions`.                            | P1  | `pnpm arch:check` runs positive/negative fixtures against the real ESLint config.                                          |
| 15  | Unused/placeholder UI surface (`Button` ignores icon props, `CardBase` advertises unsupported sizes, unused Carousel/Range/etc.), hardcoded `Loading…`, `Progress` lacks a name, `LinkBase` rewrites relative hrefs to `https://`.              | Repair APIs; remove dead components; add Dialog/ConfirmDialog/Toast (Radix), InlineAlert, LoadingState/Skeleton, EmptyState, ErrorState, Checkbox, RadioGroup, Field — each used by the reference feature. | P1  | Stories + interaction/a11y tests; keyboard, focus return, Escape, announcements.                                           |
| 16  | No component catalog.                                                                                                                                                                                                                           | Storybook 10 with app theme/i18n decorators; Vitest addon interaction + a11y tests; built in CI.                                                                                                           | P1  | `pnpm storybook:build` and `pnpm test:storybook` pass.                                                                     |
| 17  | No end-to-end tests.                                                                                                                                                                                                                            | Playwright suite against built output: demo build at root and GitHub Pages subpath, plus a non-demo production smoke.                                                                                      | P1  | `pnpm test:e2e` passes; axe checks on representative pages.                                                                |
| 18  | Single chunk, no budget.                                                                                                                                                                                                                        | Route-level lazy loading where it pays off; reproducible bundle report with a justified budget.                                                                                                            | P2  | `pnpm check:build` fails above budget.                                                                                     |
| 19  | No generator; no adoption helper; demo removal is a manual checklist.                                                                                                                                                                           | `pnpm gen` (component/feature) with dry-run and safety checks; `pnpm adopt --remove-demo` with dry-run; reproducible adoption check on a temp copy.                                                        | P1  | `pnpm gen:check` and `pnpm adopt:check` pass.                                                                              |
| 20  | Long AGENTS.md mixing rules; no recipes; no enforcement map; no dependency updates.                                                                                                                                                             | Concise AGENTS.md + `CLAUDE.md` import, recipes, task template, guardrail map; Dependabot + security process; ADRs/migration notes.                                                                        | P1  | Docs reference real commands/files; `docs/guardrails.md` maps each invariant to its check.                                 |

## Dependency decisions

Versions were chosen for compatibility with the existing Vite 7 / React 19.1 / ESLint 9
stack (registry checked 2026-10-20). The stack is **not** upgraded wholesale; the two
targeted upgrades are listed with their reason.

| Package                                                                                                                                           | Purpose                                                                                                                      | Runtime / dev                                | Why existing deps can't cover it                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `zod` 4                                                                                                                                           | Runtime parsing for env config, API payloads, form schemas (one library at every boundary).                                  | runtime                                      | No schema library exists; TS types vanish at runtime.                                                                                         |
| `react-hook-form` 7 + `@hookform/resolvers`                                                                                                       | Standard for non-trivial validated forms (focus on error, dirty/submit state).                                               | runtime                                      | `useState` forms don't scale to field-level errors, server errors and focus management.                                                       |
| `@radix-ui/react-dialog`, `@radix-ui/react-alert-dialog`, `@radix-ui/react-toast`                                                                 | Accessible headless modal, destructive confirmation, notifications (focus trap/return, Escape, portal, live region).         | runtime                                      | Rebuilding focus management and live regions by hand is the failure mode the brief warns against. Granular packages keep the footprint small. |
| `msw` 3                                                                                                                                           | Reference API in dev/demo and integration tests through the real HTTP client.                                                | dev (dynamic import only in demo/dev builds) | In-memory fakes skip the HTTP client and response validation.                                                                                 |
| `@vitest/coverage-v8`                                                                                                                             | `test:cov` provider.                                                                                                         | dev                                          | Required by Vitest for coverage.                                                                                                              |
| `storybook`, `@storybook/react-vite`, `@storybook/addon-a11y`, `@storybook/addon-vitest`, `@vitest/browser-playwright`, `eslint-plugin-storybook` | Component catalog, interaction + automated a11y checks in a real browser.                                                    | dev                                          | No catalog or browser-level component tests exist.                                                                                            |
| `@playwright/test`, `@axe-core/playwright`                                                                                                        | End-to-end and page-level accessibility checks against built output.                                                         | dev                                          | jsdom can't verify real routing, focus, reduced motion or base paths.                                                                         |
| `eslint-plugin-boundaries`, `eslint-import-resolver-typescript`                                                                                   | Import/dependency matrix enforcement with alias resolution (and `import/no-cycle` from the existing `eslint-plugin-import`). | dev                                          | ESLint has no layer model; `no-restricted-imports` can't express "feature A may not import feature B internals".                              |
| `@types/node`                                                                                                                                     | Types for config/scripts typechecking.                                                                                       | dev                                          | Tooling files were never typechecked.                                                                                                         |
| **Targeted upgrade:** `vitest` 3.2 → 4.1                                                                                                          | `@storybook/addon-vitest` 10 requires Vitest ≥4; 4.1 still supports Vite 7 and Node 24.                                      | dev                                          | —                                                                                                                                             |
| **Targeted upgrade:** `typescript` 5.8 → 5.9                                                                                                      | `msw` 3 requires TS ≥5.9 (MSW 2 receives no patches after 3.0). typescript-eslint 8 supports <6.0.                           | dev                                          | —                                                                                                                                             |

Removed: `stylelint-a11y`, `stylelint-config-styled-components`, `stylelint-config-recommended`
(unreferenced), `eslint-plugin-react-refresh` (unreferenced), `eslint-plugin-prettier`,
duplicate `@typescript-eslint/*` packages, `vite-plugin-svgr` (no `?react` imports) and
`styled-normalize` (its types broke under styled-components 6; replaced by the
`modern-normalize` stylesheet). `vite-tsconfig-paths` moved to `devDependencies`.

**Security updates (M5, `pnpm audit`).** Runtime: `react-router-dom` 7.8.2 → 7.18.4 (high
advisories; latest 7.x, not the 8.x major) and `styled-components` 6.1.19 → 6.5.3 (drops its
pinned vulnerable `postcss`; 6.6.0 was skipped as younger than two weeks), plus in-range
transitive fixes (`nanoid`, `source-map-js`, `ajv`, `fast-uri`). Tooling: `vite` 7.1.2 →
7.3.7 (dev-server advisories), in-range updates of vulnerable transitives (`rollup`,
`minimatch`, `brace-expansion`, `picomatch`, `js-yaml`, `flatted`, `ws`, `form-data`,
`yaml`, `lodash`, `browserslist`, …) and one override, `handlebars` → 4.7.10 (pinned exactly
by `eslint-plugin-boundaries`). Each step's lockfile diff was checked; a first attempt that
re-resolved ~250 packages was reverted. `pnpm audit --prod` is clean; the remaining
dev-only advisories are listed with their rationale in `SECURITY.md`.

## Gap status (2026-10-20)

| #   | Status | Verified by                                                                                       |
| --- | ------ | ------------------------------------------------------------------------------------------------- |
| 1   | done   | frozen install in every CI job; `engine-strict` refuses Node 22                                   |
| 2   | done   | `pnpm typecheck` (`tsc -b`, three projects)                                                       |
| 3   | done   | `pnpm lint --max-warnings=0`; fixtures and injected defects fail                                  |
| 4   | done   | `pnpm test:run`, `pnpm test:cov` (global + per-module floors)                                     |
| 5   | done   | lint rule against `process.env`/`import.meta.env` outside `src/config`                            |
| 6   | done   | `src/config/schema.test.ts`; invalid env fails `vite build`                                       |
| 7   | done   | `pnpm check:build` (no demo/mock code in real builds); production e2e project                     |
| 8   | done   | `AppRouter.guards.test.tsx`, `src/demo/__tests__/demoRoutes.test.tsx`, e2e protected-route tests  |
| 9   | done   | `lazyRoutes.test.tsx`, `AppRouter.integration.test.tsx`, e2e deep link/refresh/back-forward       |
| 10  | done   | `AuthProvider.test.tsx`, `sessionBoundary.test.tsx`                                               |
| 11  | done   | `src/api/http/*.test.ts`, Resources integration tests                                             |
| 12  | done   | `SignIn.test.tsx`, `Resources.test.tsx`, `forms.test.tsx`, numeric input tests                    |
| 13  | done   | `src/test/setup.ts` (unhandled request fails); `check:build` (no worker/MSW in real builds)       |
| 14  | done   | `pnpm arch:check` (24 fixtures)                                                                   |
| 15  | done   | stories + `pnpm test:storybook` (46 tests incl. axe); unit tests for every primitive with logic   |
| 16  | done   | `pnpm test:storybook`, `pnpm storybook:build` (static catalog verified under a sub-path)          |
| 17  | done   | `pnpm test:e2e` (27 tests: demo root, demo sub-path, production build)                            |
| 18  | done   | `pnpm check:build` (gzip budgets, lazy routes); SignIn and Resources routes code-split            |
| 19  | done   | `pnpm gen:check` (17 checks), `pnpm adopt:check` (44 checks over three scenarios)                 |
| 20  | done   | `AGENTS.md`/`CLAUDE.md`, recipes, `docs/guardrails.md`, ADRs 0009–0016, `SECURITY.md`, Dependabot |

## Milestones

1. **Baseline/tooling** — Node/pnpm alignment, lockfile, tsconfig projects, ESLint type-aware
   rules, Prettier scope, Vitest environment fix, coverage, CI skeleton.
2. **Architecture and configuration** — config entry + modes, composition root, motion
   contracts, shell reclassification, boundaries + fixtures, dead-code removal, router
   derivation/demo gating/unknown routes.
3. **Data/auth/forms** — auth contract v2 + session boundary, HTTP client, query defaults,
   MSW, Field + RHF.
4. **Shared UI and reference feature** — primitives, Storybook, Resource feature, i18n fixes,
   lazy routes + bundle budget, generator.
5. **Browser verification and adoption** — Playwright + axe, production artifact inspection,
   adoption helper + check, docs, ADRs, AGENTS.md, full CI.

## Checkpoint log

Update after each milestone with what passed and what is next.

- **M0 (baseline)** — recorded above.
- **M1 (baseline/tooling) — done.** Node 24 LTS (`.nvmrc` = 24, `engines` ≥24.11.0,
  `engine-strict`), lockfile regenerated, unused deps removed (`stylelint-a11y`,
  `stylelint-config-*`, `eslint-plugin-react-refresh`, `eslint-plugin-prettier`,
  `@typescript-eslint/*` duplicates, `vite-plugin-svgr`, `styled-normalize` →
  `modern-normalize`). tsconfig base/app/test/node + solution root (`tsc -b`), strict
  flags incl. `noUncheckedIndexedAccess`/`exactOptionalPropertyTypes`; ESLint type-aware
  via project service, `--max-warnings=0`, unused-disable reporting; Prettier covers
  md/yml/configs; stylelint `--max-warnings=0`; Vitest 4.1 with a jsdom environment that
  keeps Node's fetch/abort globals (`src/test/vitest-environment.ts`); coverage floors.
  Dead modules removed (see ADR 0009). Motion contracts moved to `utils/transitions`;
  route shells moved to `containers/RouteTransitions`. **Defect fixed:** a guest could
  reach the protected Dashboard by finishing the onboarding preview
  (`AppRouter.guards.test.tsx` reproduced it); router type is now derived from auth
  state. Evidence: `pnpm validate` (60 tests), `pnpm test:cov`, `pnpm build` pass;
  clean `--frozen-lockfile` install + validate + build pass on Node 24.11.0; Node 22
  install refused by `engine-strict`.
  Next: M2 — config module + modes, composition root/auth adapter injection, demo
  gating, boundaries + fixtures, unknown routes/returnTo.
- **M2 (architecture and configuration) — done.** `src/config` (Zod schema shared by
  runtime and `vite.config.ts`; strict booleans; URL rules; invalid combinations fail
  `vite build`/dev start), `buildFlags` (`DEMO_MODE`, `MOCKS_ENABLED`, `IS_DEV`) for
  dead-code elimination; per-mode `.env.*`. Composition root: `main.tsx` bootstrap,
  `containers/composition/{createAuthAdapter,startMocking}`, `App` takes `authAdapter`
  - `queryClient`. Auth contract v2 (adapters return results; provider owns state,
    serializes operations, ignores late results, restore failure → `status: 'error'`,
    `onIdentityChange` → `resetSessionCache`). HTTP client + `ApiError` + session adapter
    pulled forward from M3 (needed by the composition root). Demo module `src/demo`
    (demo adapter, DemoHub lazy route, guest onboarding preview) gated by `DEMO_MODE`;
    build inspection: non-demo bundle has no demo adapter/DemoHub/MSW/worker.
    Routing: injectable `AppRouter` (route table + router factory), unknown-route policy
    with safe `returnTo` (lost destination reproduced first, then fixed), Not Found page,
    loading/session-error screens, old routers disposed. ESLint boundaries
    (`eslint/boundaries.js`) + `import/no-cycle` + `no-extraneous-dependencies` + config
    access guard; `pnpm arch:check` with 16 fixtures (alias/relative/re-export/dynamic
    bypass attempts, cycles, unknown folders, positive cases). Layering fixes:
    `utils/colors`→`styles/colors`, `utils/numberFormat`→`i18n/numberFormat`,
    `returnTo`→`globals/navigation`, `CenterToTopEntrance` no longer reads navigation
    context. Pseudo-locale generator. Pages workflow builds `build:demo`.
    Evidence: `pnpm validate` (104 tests, 16 fixtures) passes; `vite build` without
    `VITE_API_BASE_URL` fails with a diagnostic; demo auth in production fails.
    Next: M3 — HTTP client tests, query defaults + session cache isolation test, MSW
    reference API, Field + React Hook Form, SignIn migration, error-message mapping.
- **M3 (data/auth/forms) — done.** HTTP client tests (base URL, query, headers, JSON,
  204/empty bodies, malformed payload → `schema`, invalid JSON → `parse`, HTML 502 body,
  422 field errors, network, abort, credentials) via MSW; session adapter tests against
  the documented endpoint contract; `getErrorMessageKey` (non-React errors → i18n keys);
  bounded retry policy tests; session isolation tests (cached data and a non-abortable
  late response) — both **fail when `resetSessionCache` is disabled** (verified with an
  injected defect, then reverted). MSW Node server in every unit test; unexpected
  requests fail the test. Theme `feedback` tokens with measured contrast (the old error
  color was 1.8:1). New primitives: Spinner, LoadingState, Skeleton, InlineAlert,
  EmptyState, ErrorState, Field, Checkbox, RadioGroup, Button `isPending`; the Control
  root is no longer a `<label>` (avoids duplicate labels with Field); solid focus ring.
  `src/forms` (error codes → i18n, `useFieldErrorMessage`, `applyServerFieldErrors`),
  registered in boundaries/tsconfig. SignIn migrated to Zod + React Hook Form + Field.
  Evidence: `pnpm validate` (159 tests) passes; coverage 72.7/58.4/78.8/74.1.
  Next: M4 — Resource reference feature (list, create/edit dialog, delete confirm,
  toast, URL filter, MSW handlers), Dialog/ConfirmDialog/Toast, Storybook + browser
  tests, i18n `t` reactivity fix, lazy routes + bundle budget, generator, coverage
  floors.
- **M4 (shared UI and reference feature) — done.** Provider `t` bound to the locale
  (`provider.memo.test.tsx` reproduced stale memoized copy first). Dialog/ConfirmDialog
  (Radix, controlled, focus return with fallback) and Toast (Radix, provider in `App`).
  Resource reference feature (`src/features/resources`: model/api/queries/components/
  mocks/index.ts; URL filter; create/edit dialog with client and server validation;
  delete confirmation; toasts; invalidation; locale switching) on a lazy route;
  `demoApi`/`queryKeys` and the unused `src/globals/react-query.ts` removed. Storybook 10
  (`.storybook/`: app providers, locale toolbar, MSW worker, axe `test: 'error'` over the
  whole body so portals are covered; Storybook-specific Vite config that pins
  `.env.storybook`, because Storybook preloads `.env.production` during builds).
  Browser tests found and fixed real defects: `Select` threw from an unguarded
  `showPicker()` (and blocked the native picker), radio descriptions were part of the
  accessible name, `Progress` had no name. Lazy routes carry their error boundary so a
  failed chunk load offers **Reload** instead of a perpetual loading screen (reproduced
  first). Build module report + `pnpm check:build` (gzip budgets, lazy modules, forbidden
  content, base path, no source maps) — negative-tested with an eager import and a demo
  build checked against the production profile. SignIn route code-split (initial JS
  198 → 176 kB gzip at the time); `font-display: swap`. Generator (`pnpm gen feature`)
  with dry run and name/path safety, verified by `pnpm gen:check` in a temporary copy (an
  injected template type error fails it). Coverage floors raised and per-module floors
  added.
- **M5 (browser verification and adoption) — done.** Playwright suite against built apps
  (demo at root and under `/starter/`, real production build with `page.route` backend):
  journeys, protected-route denial, deep links with refresh and back/forward, keyboard
  only, language switching, fault-driven errors, axe on key pages, reduced motion with a
  control test; every test fails on console/page errors; `failOnFlakyTests` on CI; 78/78
  across three repetitions. Defects found and fixed with tests: zoom disabled in the
  viewport meta (WCAG 1.4.4), missing `main` landmarks (Welcome, Not Found, DemoHub),
  skipped heading levels in the reference list, the fading-out page exposed to assistive
  technology (two `main` landmarks; also re-exposure when it re-enters mid-fade), the
  router swap losing a redirect that ran before `AppRouter` subscribed (memory routers),
  decimal input that erased the separator while typing and reported unrounded values.
  Adoption: `starter.manifest.json` (provenance + groups), `pnpm adopt` (markers, dry
  run, works without git), MSW session backend for post-adoption development, demo-only
  tests moved into `src/demo`, architecture fixtures made independent of product code,
  direct tests for infrastructure previously covered only by the reference feature;
  `pnpm adopt:check` passes for demo-only, reference-only and both (and the adopted
  project's e2e suite passed when run manually). CI: validate, audit, coverage, build +
  inspection (+ demo), Storybook, e2e, scaffolding; composite setup actions; Pages
  deploy uses `check:build:demo --base`. Dependabot (grouped, 14-day cooldown) and
  `SECURITY.md`; security updates as described under Dependency decisions. Docs:
  AGENTS.md, CLAUDE.md, guardrails, boundaries, configuration, routing, UI foundation,
  recipes, task template, ADRs 0009–0016 and amendments, migration notes, adoption guide,
  README.
  Final evidence (Node 24.21.0): `pnpm validate` — 40 files / 209 unit tests, 24 fixtures;
  `pnpm test:cov` — 80.6 / 68.8 / 86.7 / 82.2 (statements / branches / functions / lines); `pnpm check:build` — initial JS 181.1 kB
  gzip (budget 185), total 216.0 (225); demo profile OK; `pnpm test:storybook` — 46 tests
  (cold cache); `pnpm storybook:build` OK; `pnpm test:e2e` — 27 passed; `pnpm gen:check` OK;
  `pnpm adopt:check` OK; `pnpm audit --prod` — no known vulnerabilities.
  Follow-ups: see the final report (externally blocked checks and recommended next steps).
