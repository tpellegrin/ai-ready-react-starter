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
- **Styled-components styling approach**: Using theme tokens and global styles in `src/styles/`. Components use direct named imports for local styles (no namespace imports).
- **Colocated Logic**: For components with meaningful logic, colocate it in a `logic.ts` file beside the component. `index.tsx` should focus on rendering and composition, while `logic.ts` handles data fetching, state, and handlers.
- **Component primitives**: Reusable, domain-neutral components in `src/components/`.
- **Animation system**: Unified route and reveal animations.
- **Flow navigation contract**: Standardized flow path resolution and navigation in `src/flows/fromPaths.ts`. New flows must conform to this contract (keys in `paths.flow` matching URL segments) instead of modifying the infrastructure.
- **i18n system**: Multi-language support in `src/i18n/`.
- **Validation scripts**: Automated checks via `pnpm validate`.

## How to work
Before changing code:
- Inspect nearby files.
- Identify the existing pattern.
- Styled components:
  - Import directly from `./styles` (no `import * as _`).
  - Internal names start with `_` and include the component name (e.g., `_ButtonRoot`).
  - Use `Root` for top-level elements, descriptive suffixes for others.
- Colocated Logic (`logic.ts`):
  - For components with meaningful local logic, colocate that logic in a `logic.ts` file beside the component.
  - Keep `index.tsx` focused on rendering (JSX structure, passing props).
  - Put data fetching, derived state, navigation handlers, filtering, and component-specific hooks in `logic.ts`.
  - Avoid logic.ts for tiny purely presentational components.
- Reuse existing primitives and helpers.
- Prefer existing common components such as `Flex`, `Box`, and `Text`.
- `Box` is a visual surface/card-like component, NOT a neutral layout div. It has a visible border by default. Do not use it for grouping elements without a visible container.
- For neutral layout behavior, use `Flex` or create local styled components in the feature/view folder instead of introducing broad global primitives.
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
- Modifying foundational baseline layout components (e.g., `BaseLayout`) to solve feature-specific UI issues. These components must remain generic and stable. Use page-specific composition, feature layouts, or wrapper components instead.
- Duplicate component primitives.
- Overly abstract “future-proof” systems.
