# 0016 — Adoption, scaffolding and provenance

## Status

Accepted (2026-10)

## Decision

- `starter.manifest.json` records the starter's identity/version and the
  removable groups: `demo` (DemoHub, demo auth, demo build/deploy) and
  `reference` (the Resource feature).
- `pnpm adopt --remove-demo [--remove-reference] [--dry-run]` deletes the
  listed files, package scripts and i18n keys and rewrites marker regions
  (`starter:<group>-start` / `-else` / `-end`) inside shared files. All markers
  are validated before the first write; the manifest records what was
  removed.
- `pnpm gen feature <name>` scaffolds a feature from
  `scripts/templates/feature` with name/path safety and a dry run.
- `pnpm adopt:check` and `pnpm gen:check` prove both in temporary copies of
  the repository against every gate.

## Why

A manual removal checklist drifts from the code; adopters ended up deleting
files until the build passed. Scaffolding by copy-paste spreads mistakes.

## Consequences

- Shared files that mention demo/reference code carry markers; keep them
  balanced (adoption fails loudly otherwise).
- Removing the reference feature must not drop shared-infrastructure
  coverage below its floors, so infrastructure has direct tests.

## Change guidance

When adding demo or reference code, list its files in the manifest or wrap
its references in markers, then run `pnpm adopt:check`.

## Amendment (2026-10): provenance, Markdown, product scenario, generators

- The first adoption records the starter commit (`starterRevision`) in the
  manifest; the manifest's `adoption` field also tells agents whether they
  maintain the starter or build a product (`AGENTS.md`).
- Markdown regions (`<!-- starter:<group>-start -->` lines) let adoption
  remove docs about removed code; `pnpm docs:check` keeps instructions
  accurate after adoption.
- `pnpm adopt:check` runs each adopted project's own `pnpm verify` (without
  the adoption check, so verification never recurses) and adds a `product`
  scenario that generates a domain feature and page after adoption.
- `pnpm gen` covers features, components, pages and flows with one
  validated plan/apply core and `starter:gen` markers in the existing
  registries; `pnpm gen:check` no longer depends on removable code.

## Amendment (2026-10): the adoption check is starter-only

- `pnpm adopt:check` verifies adopting the starter: it expects a fresh
  adoption record (`removed` equal to the scenario's groups,
  `starterRevision` equal to the copy's commit). An adopted project keeps
  its first adoption's record, so the check cannot pass there.
- A manifest group without a flag (`maintenance`) is removed by every
  `pnpm adopt` run. Its `starter:maintenance` markers wrap the `adoption`
  step in `scripts/lib/verify-steps.mjs` and the `adoption` CI job, so an
  adopted project's `pnpm verify` and CI never run the check. Markers,
  rather than a run-time skip, keep `pnpm docs:check`'s "verify and CI
  agree" rule as it is.
- In an adopted project (`adoption` set), `pnpm adopt:check` refuses to run
  (exit 2) and says why; it never reaches the manifest assertions.
- The scenarios now check the adopted copy's own setup without
  `STARTER_NESTED_VERIFY`: no `adoption` step, no `adopt:check` in CI, and
  the refusal. The nested verify still sets it, now only to skip the
  audit; skipping the adoption step there is what had hidden the problem.
- Projects adopted earlier delete the step and job by hand
  (`docs/migration-notes.md`).
