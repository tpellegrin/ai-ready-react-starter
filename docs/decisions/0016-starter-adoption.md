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
