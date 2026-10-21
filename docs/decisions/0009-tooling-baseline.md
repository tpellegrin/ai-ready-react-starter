# 0009 — Tooling baseline and quality gates

## Status

Accepted (2026-10)

## Decision

- Node 24 LTS (`.nvmrc`, `engines` with `engine-strict`), pnpm pinned via
  `packageManager`, CI installs with `--frozen-lockfile`.
- TypeScript as a solution of three projects sharing `tsconfig.base.json`:
  `app` (shipped code), `test` (tests, stories, test utilities) and `node`
  (configs, scripts, e2e). Strict, with `noUncheckedIndexedAccess` and
  `exactOptionalPropertyTypes`. `pnpm typecheck` is `tsc -b`.
- Type-aware ESLint over the whole repository with `--max-warnings=0`:
  unsafe-`any` flows, floating/misused promises, explicit `any` and hook
  dependencies are errors; `void promise` does not count as handling.
- Vitest with coverage floors (global and per core module), Prettier over
  every text format, Stylelint with zero warnings.
- Two targeted upgrades only: Vitest 3.2 → 4.1 (required by the Storybook
  Vitest addon) and TypeScript 5.8 → 5.9 (required by MSW 3).

## Why

The previous gates passed while the strict project could not resolve its own
imports (472 errors), warnings were allowed and most type-aware rules were
off, so green CI meant little. Tests failed on Node 24 and coverage could not
run.

## Consequences

- Every check is a command (`docs/guardrails.md`); `pnpm verify` runs CI
  locally.
- A custom Vitest environment (`src/test/vitest-environment.ts`) keeps Node's
  fetch/AbortSignal under jsdom (Node 24's undici brand check).
- New code must type-check under the strict flags; casts from `unknown` are
  explicit.

## Change guidance

Raise floors and tighten rules freely; loosening one needs a reason in the
same change. Keep `pnpm verify`, CI and `docs/guardrails.md` in sync.
