# 0001 — App Shell and Provider Composition

## Status
Accepted

## Decision
The application uses a centralized app shell (`src/containers/App.tsx`) to compose all global providers (Data, Theme, i18n, Auth, Routing).

## Why
This approach ensures a predictable initialization order and a single source of truth for the application's global state and infrastructure. It simplifies testing by allowing developers to wrap test components in the same provider stack.

## Consequences
- All global infrastructure must be added to this shell.
- Provider order must be preserved if dependencies exist (e.g., `AuthProvider` may depend on `I18nProvider`).
- Avoid adding provider-specific logic directly to views.

## Change guidance
To add a new global provider, wrap the existing tree in `src/containers/App.tsx`. Ensure it is placed at the correct level of the hierarchy.
