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
