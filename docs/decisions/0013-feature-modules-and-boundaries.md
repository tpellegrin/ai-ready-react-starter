# 0013 — Feature modules and enforced import boundaries

## Status

Accepted (2026-10)

## Decision

- Product capabilities live in `src/features/<name>` with a single public
  entry (`index.ts`), feature-owned model/api/queries/components/mocks.
- Every `src/` folder has an element type; an import matrix
  (`eslint/boundaries.js`) says who may import whom. Shared layers never
  depend on features; features never import each other; production code never
  imports tests, stories, test utilities or mocks; import cycles fail.
- `pnpm arch:check` lints positive/negative fixtures with the real config,
  so a misconfigured rule cannot silently pass.
- Route transition shells moved to `src/containers/RouteTransitions` and
  neutral motion contracts to `src/utils/transitions`, so shared UI no longer
  imports app containers.

## Why

Without enforcement, shared components imported app containers and the
"layers" existed only in documentation.

## Consequences

- New top-level folders must be classified deliberately.
- Cross-feature needs are solved by composition in views or by promoting code
  to a shared layer.

## Change guidance

See `docs/architecture/boundaries.md`. Change the matrix together with a
fixture that proves the new rule.
