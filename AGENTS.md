# AI Agent Instructions

## Project identity

A reusable React 19 + Vite + TypeScript + styled-components SPA foundation,
not a product. Keep examples neutral, replaceable and easy to remove.
Adopting it: [`docs/adoption.md`](docs/adoption.md) (`pnpm adopt`).

## Prime directive

Preserve the existing architecture. Prefer small, incremental changes that
follow existing patterns. Do not rewrite, flatten or replace systems unless
explicitly asked. Never weaken a guardrail (thresholds, budgets, lint rules,
skipped tests) to make a change pass.

## Systems to preserve (and where they are documented)

| System                                        | Location                                                       | Docs                                  |
| --------------------------------------------- | -------------------------------------------------------------- | ------------------------------------- |
| Composition root + app shell                  | `src/main.tsx`, `src/containers/App.tsx`                       | `docs/architecture.md`, ADR 0001/0010 |
| Validated config (`VITE_*`, public)           | `src/config`                                                   | `docs/configuration.md`               |
| Session-state routing (guest/onboarding/user) | `src/containers/AppRouter.tsx`, `containers/routing`           | `docs/routing.md`                     |
| Auth adapter boundary                         | `src/auth`                                                     | `docs/recipes/real-auth-adapter.md`   |
| HTTP client + TanStack Query                  | `src/api`; per feature `api.ts`/`queries.ts`                   | `docs/recipes/data-and-forms.md`      |
| Feature modules + import boundaries           | `src/features/<name>`, `eslint/boundaries.js`                  | `docs/architecture/boundaries.md`     |
| Reference feature (canonical example)         | `src/features/resources`                                       | `docs/recipes/new-feature.md`         |
| UI primitives, forms                          | `src/components`, `src/forms`                                  | `docs/ui/foundation.md`               |
| Styling (theme tokens)                        | `src/styles`                                                   | ADR 0005                              |
| Animation system                              | `src/containers/RouteTransitions`, `src/components/Animations` | `docs/animation-system.md`            |
| Flow navigation contract                      | `src/flows/fromPaths.ts`, `paths.flow`                         | `docs/flows.md`                       |
| i18n                                          | `src/i18n`                                                     | `src/i18n/README.md`                  |
| Mock API (MSW)                                | `src/mocks`, feature `mocks/`                                  | ADR 0015                              |

## How to work

Before changing code: inspect nearby files, identify the pattern, and follow
the closest recipe in `docs/recipes/` (task template: `docs/task-template.md`).

- **Features:** scaffold with `pnpm gen feature <name>`; import a feature only
  through its `index.ts`; features never import each other.
- **Data:** every request goes through `apiClient` with a Zod response schema
  and the query's `signal`; query keys belong to the feature.
- **Forms:** React Hook Form + Zod (error codes) + `Field`.
- **Async from handlers:** `runDetached(promise, onError)`, never `void promise`.
- **Config:** read through `src/config`; never `import.meta.env`/`process.env`
  elsewhere. `VITE_*` values are public — no secrets.
- **Styled components:** import by name from `./styles` (no `import * as _`);
  internal names start with `_` plus the component name (`_ButtonRoot`); `Root`
  for the top-level element.
- **Colocated logic:** components with meaningful logic keep data fetching,
  derived state, handlers and component hooks in `logic.ts`; `index.tsx`
  renders. Skip `logic.ts` for tiny presentational components.
- **Primitives:** reuse `Flex`, `Text`, `Field`, the feedback states, etc.
  `Box` is a visible surface (border by default), not a layout div; for neutral
  layout use `Flex` or a local styled component.
- **Copy and names:** all user-facing text through `t()` in every locale;
  neutral names (`Item`, `Resource`, `Profile`).
- **Accessibility:** visible labels, one `h1` and `main` per page, focus
  returns after dialogs, `prefers-reduced-motion` respected.
- **Tests:** add a test that fails without your fix; integration tests run
  against MSW (unhandled requests fail).

After changing code: run `pnpm validate` (everything CI runs: `pnpm verify`),
fix what your change broke, report commands and results honestly, and update
docs when a pattern changes. The invariant → check map is `docs/guardrails.md`.

## Avoid

- Large rewrites of core systems; new libraries without a strong reason
  (record it in an ADR).
- Domain-specific names or workflows (`Order`, `Checkout`, `Patient`).
- Hardcoded visual values outside the theme.
- Auth storage access outside auth adapters; data fetching in UI primitives.
- Bypassing route groups, guards or provider boundaries.
- Editing foundational layout components (e.g. `BaseLayout`) for
  feature-specific needs: compose page or feature layouts instead.
- Duplicate primitives; overly abstract "future-proof" systems.
- Deleting demo/reference code by hand: use `pnpm adopt`.
