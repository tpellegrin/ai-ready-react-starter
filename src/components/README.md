# Components Folder

## Purpose

Shared, domain-neutral building blocks that views and features compose.
List them with `pnpm catalog`; usage guidance is in
`docs/ui/foundation.md`.

## Rules

- **Public API = `index.tsx`.** Other code imports only the folder's index
  (and the types it exports); `styles.ts`, `logic.ts` and helpers are
  private (lint-enforced).
- **Internal elements** are `_<Component><Part>` in `styles.ts`, imported
  by name from `./styles` only (lint-enforced).
- **Domain-neutral**, **theme tokens only**, **data through props** (no
  fetching; lint-enforced).
- **Logic separation:** meaningful state and handlers in `logic.ts`; simple
  presentational components have none.

## Extension guidance

Check `pnpm catalog` and the inventory first; extend or compose an existing
component when you can. New ones: `pnpm gen component <Name>` (story with
play + axe included).
