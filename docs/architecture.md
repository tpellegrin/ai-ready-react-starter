# Architecture Overview

## Project purpose
This project is a reusable frontend boilerplate designed for speed, maintainability, and AI-friendliness. It provides a solid foundation with pre-configured systems for routing, authentication, styling, and data fetching, allowing developers (and AI agents) to focus on building features rather than infrastructure.

## Architectural principles
- **Preserve existing systems**: The core infrastructure is designed to be stable. Extend it instead of replacing it.
- **Prefer composition**: Build complex UIs by composing small, generic primitives.
- **Keep infrastructure generic**: Infrastructure should not know about specific product domains.
- **Keep examples replaceable**: Demo code (sign-in, example queries) should be easy to remove or replace.
- **Avoid domain-specific logic**: Use neutral terminology across the boilerplate.
- **Avoid overengineering**: Build the simplest solution that fits the architecture.

## App shell
The application shell is managed in `src/containers/App.tsx`. It composes global providers in a specific order:
1. `QueryClientProvider` (Data fetching)
2. `ThemeProvider` (Styling)
3. `I18nProvider` (Internationalization)
4. `AuthProvider` (Authentication)
5. `NavigationProvider` (Routing state)
6. `ProgressBarProvider` (UI feedback)
7. `AppRouter` (Routing logic)

## Routing
The app uses an **app-state-based routing model** in `src/containers/AppRouter.tsx`.
- **Guest Router**: For unauthenticated users (Sign In, Sign Up, Welcome).
- **Onboarding Router**: For users who are authenticated but haven't finished setup.
- **User Router**: For fully authenticated and setup users (Dashboard, Settings).
  Guards are handled by the `AppRouter` switching logic, which reacts to auth and navigation state.

## Authentication
Authentication is abstracted via an **Auth Adapter** pattern in `src/auth/`.
- `AuthAdapter`: The interface defining the contract.
- `AuthProvider`: Manages the current adapter and exposes auth state via `useAuth`.
- `mockAdapter.ts`: A demo implementation for development without a backend.
  To move to production, replace the mock adapter with a real implementation (e.g., OIDC, Firebase) without changing the `useAuth` consumers.

## Data fetching/API layer
Managed via **TanStack Query (React Query) v5**.
- Configuration is in `src/globals/react-query.ts`.
- API functions live in `src/api/`.
- Query keys are centralized in `src/api/queryKeys.ts`.
- Views consume data using `useQuery` or `useMutation` hooks with the object signature.
- **Constraint**: Do not perform raw `fetch` calls directly in components; always go through the API layer.

## Forms
Forms should follow a consistent pattern:
- Use reusable components from `src/components/Form/` and `src/components/LabeledInputField`.
- Handle loading, error, and success states clearly.
- Ensure all labels and messages are i18n-ready.

## UI components
- **Primitives**: Low-level, domain-neutral components (Button, Text, Box) in `src/components/`.
- **Shared Components**: Reusable UI patterns (CardBase, ModalBase).
- **Composition**: Prefer composing primitives over creating monolithic components.
- **Colocated Logic**: For components with meaningful local logic (data fetching, state, handlers), colocate that logic in a `logic.ts` file beside the component's `index.tsx`. The index file should remain focused on rendering and composition.

## Styling and theme
Powered by **styled-components**.
- **Themes**: Design tokens (colors, spacing, typography) live in `src/styles/themes/`.
- **Global Styles**: Base styles and resets in `src/styles/global.ts`.
- **Tokens**: Always use `props.theme` values instead of hardcoding CSS values.
- **Conventions**:
  - Components use direct named imports for local styles from `./styles`.
  - No namespace imports (`import * as _` or `import * as S`).
  - Internal styled components start with `_` and include the owning component name (e.g., `_ButtonRoot`).
  - Styled components are exported from a separate `styles.ts` or `styles.tsx` file.

## Flow system
The app has a dedicated flow architecture for guided, multi-step experiences.
- **Flow routes**: Use the `/flow/` URL prefix. AppRouter automatically routes them through `CenterTransitionShell` for LTR/RTL slide transitions.
- **Path registry**: Step paths and ordering live in `src/globals/paths.ts` under the `flow` key. New flows must conform to the existing contract (keys in `paths.flow` matching URL segments) instead of modifying navigation infrastructure.
- **Helpers**: `src/flows/fromPaths.ts` provides `getNextStepPath`, `getPrevStepPath`, etc.
- **Hooks**: `useFlowNav` (navigation) and `useFlowProgressFromPaths` (progress) in `src/hooks/`.
- **Layout**: All flow screens compose `FlowLayout` from `src/containers/Layouts/FlowLayout/`.
- **Demo**: The onboarding flow (`src/views/onboarding/`) is the canonical reference implementation.
- See [`docs/flows.md`](./flows.md) for the full flow architecture reference.

## Animation
The project includes a unified animation system:
- **Route Transitions**: Handled by `AnimatedOutlet` and `CenterTransitionShell`.
- **Helpers**: Found in `src/components/Animations/`.
- **FLIP**: Use `useFlipLayout` for smooth repositioning.

## i18n
Multi-language support is managed in `src/i18n/`.
- Locales live in `src/i18n/locales/`.
- Use the `useI18n` hook for translations.
- **Constraint**: Avoid hardcoding user-facing strings in JSX.

## Testing
- **Vitest**: Used for unit and integration tests.
- **Testing Library**: React Testing Library is used for component and integration tests.
- **Location**: Tests should live next to the files they test (e.g., `Component.test.tsx`).
- Run tests via `pnpm test:run`.

## Validation
A comprehensive validation suite is available via `pnpm validate`. It runs:
- Prettier check
- ESLint
- Stylelint
- TypeScript typecheck
- i18n consistency check
- Vitest suite

## Environment configuration
- Use `.env.example` as a template for environment variables.
- Never commit actual secrets or `.env` files.

## Extension workflow
1. Identify if the change is **Infrastructure** (generic) or **Example** (replaceable).
2. Find the appropriate folder based on the architectural layer.
3. Follow the existing naming and implementation patterns.
4. Run `pnpm validate` to ensure no regressions.
