# 0008 — Validation and Continuous Integration

## Status

Accepted

## Decision

The project uses a unified validation script (`pnpm validate`) that must pass before any code is committed or deployed.

## Why

This ensures a high level of code quality and prevents regressions. Automating these checks in CI provides a safety net for developers and AI agents alike.

## Consequences

- Every PR must pass `pnpm validate`.
- Failures in linting, types, or tests block the pipeline.
- Developers and AI agents should run this command locally before submission.
- Commit messages must be single-line Conventional Commits. Commit bodies and footers are intentionally disallowed.

## Change guidance

Modify the `validate` script in `package.json` if new quality tools are added. Ensure the CI configuration (`.github/workflows/`) remains in sync with the validation script.

## Amendment (2026-10)

- `pnpm validate` now also runs Stylelint, the i18n checks and the
  architecture fixtures; ESLint/Stylelint run with zero warnings.
- CI runs parallel jobs: validate, production dependency audit, coverage,
  build + artifact inspection, Storybook tests/build, e2e, scaffolding checks
  (`.github/workflows/ci.yml`). `pnpm verify` runs the same set locally.
- The invariant-to-check map is `docs/guardrails.md`; see also
  [0009](0009-tooling-baseline.md) and [0015](0015-testing-strategy.md).
