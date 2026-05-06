# AI Agent Instructions

## Project identity
This repository is a reusable frontend boilerplate built with React 19, Vite, TypeScript, and Styled Components.
It is not a product application. Keep examples neutral, replaceable, and easy to remove.

## Adopting the boilerplate

For replacing demo auth/API/views/flows, follow [`docs/adoption.md`](docs/adoption.md).
It documents which files are reusable infrastructure and which are demo-only.

## Prime directive
Preserve the existing architecture.
Prefer small, incremental changes that follow existing patterns.
Do not rewrite, flatten, or replace systems unless explicitly asked.

## Existing systems to preserve
- **App shell/provider composition**: Managed in `src/containers/App.tsx`.
- **App-state-based routing**: Managed in `src/containers/AppRouter.tsx`, switching between Guest, Onboarding, and User routers.
- **Auth adapter/provider boundary**: Defined in `src/auth/`, providing a clear interface for authentication.
- **React Query/API layer**: Uses `@tanstack/react-query` for data fetching. The canonical example lives in `src/api/demoApi.ts`, with shared query keys in `src/api/queryKeys.ts`.
- **Styled-components styling approach**: Using theme tokens and global styles in `src/styles/`.
- **Component primitives**: Reusable, domain-neutral components in `src/components/`.
- **Animation system**: Unified route and reveal animations.
- **i18n system**: Multi-language support in `src/i18n/`.
- **Validation scripts**: Automated checks via `pnpm validate`.

## How to work
Before changing code:
- Inspect nearby files.
- Identify the existing pattern.
- Reuse existing primitives and helpers.
- Prefer extending the current architecture over creating a parallel one.
- Keep names neutral and reusable (e.g., `Item`, `Resource`, `Profile`).
- Keep copy i18n-ready.
- Keep examples generic.

After changing code:
- Run `pnpm validate`.
- Fix failures caused by the change.
- Update docs if an architectural pattern changed.

## Avoid
- Large rewrites of core systems.
- New libraries unless strongly justified.
- Domain-specific names or workflows (e.g., `Order`, `Checkout`, `Patient`).
- Hardcoded visual values outside the theme.
- Direct auth storage access outside auth adapters.
- Direct data fetching in UI primitives.
- Bypassing route guards or provider boundaries.
- Duplicate component primitives.
- Overly abstract “future-proof” systems.
