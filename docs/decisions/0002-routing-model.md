# 0002 — App-State-Based Routing Model

## Status

Accepted

## Decision

The project uses a specialized `AppRouter` that switches between different router configurations (Guest, Onboarding, User) based on the current authentication and onboarding state.

## Why

This provides hard boundaries between different phases of the user journey. It prevents unauthenticated users from accessing protected routes at the router level and simplifies route guard logic by making it implicit in the current router state.

## Consequences

- Routes must be categorized into one of the three states.
- Redirection between states is handled automatically by the `AppRouter`.
- Deep linking must account for the state-based switching.

## Change guidance

Add new routes to the appropriate route array in `src/views/guest/index.tsx`, `src/views/onboarding/index.tsx`, or `src/views/user/index.tsx`.

## Amendment (2026-10)

- The router group is derived during render from auth state
  (`deriveRouterType`); nothing switches routers imperatively. The guest
  onboarding preview exists only in demo builds.
- Unknown paths follow a per-group policy (Not Found page, or sign-in with a
  validated `returnTo`), and the next router starts where the previous one
  ended, so deep links survive sign-in.
- Lazy routes carry their error boundary in the loaded module; failed chunk
  loads offer a reload.
- Details: `docs/routing.md`.
