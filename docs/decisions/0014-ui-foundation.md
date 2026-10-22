# 0014 — Small UI foundation with headless Radix for overlays

## Status

Accepted (2026-10)

## Decision

- Keep a small set of domain-neutral primitives (`docs/ui/foundation.md`).
  Remove unused components and placeholder APIs; repair broken ones (Button
  icons, pending state; LinkBase; Progress name; Select picker).
- Use granular Radix packages (`react-dialog`, `react-alert-dialog`,
  `react-toast`) for focus trapping, focus return, Escape handling, portals
  and live regions, styled with theme tokens.
- Each primitive has stories with interaction and axe checks run in Chromium.
- `Text` renders text elements only (`as` is a union of text tags) and
  inherits typography/color unless `variant`/`color` is given.

## Why

Hand-built focus management and live regions are a common source of
accessibility bugs; a large unused component surface misleads adopters and
agents.

## Consequences

- Dialog openers get focus back (or a fallback when they are gone).
- Primitives stay presentational; data-driven regions use the four-state
  pattern (loading, error, empty, content).

## Change guidance

Add a primitive only when two features need it; include a story with a play
function.

## Amendment (2026-10): public components and internal elements

- Two levels: public components (a folder's `index`) and internal
  `_<Component><Part>` styled elements in its `styles.ts`, imported by name
  from `./styles` only and never re-exported. Enforced by boundaries and
  `eslint/plugin.js`; details in `docs/ui/foundation.md`.
- Deliberately shared pieces are explicit exports of the index (prop types,
  the dialog family's `useReturnFocus` and surface styles). Button's label
  composes the public `Text` instead of its internal element.
- `pnpm catalog` lists the public building blocks from source;
  `pnpm gen component` adds one (shared or feature-scoped, `logic.ts` only
  on request) and refuses duplicates.
