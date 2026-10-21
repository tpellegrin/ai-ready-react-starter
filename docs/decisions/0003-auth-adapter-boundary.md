# 0003 — Auth Adapter Boundary

## Status

Accepted

## Decision

Authentication logic is decoupled from the UI via an `AuthAdapter` interface and an `AuthProvider` that consumes it.

## Why

This makes the authentication system completely replaceable. During development, a `mockAdapter` can be used to simulate different user states without a backend. For production, a real adapter (e.g., Auth0, Firebase, custom API) can be implemented and injected into the provider without changing any view-level code.

## Consequences

- Views must only depend on the `useAuth` hook.
- The `AuthAdapter` interface must remain stable.
- Direct access to storage (local/session/cookies) for auth tokens is prohibited in views.

## Change guidance

To change auth providers, implement the `AuthAdapter` interface in `src/auth/types.ts` and update the adapter initialization in `src/auth/AuthProvider.tsx`.

## Amendment (2026-10): adapter contract v2

- Adapters return results (`restoreSession → User | null`, `signIn → User`,
  `completeOnboarding → User`); `AuthProvider` owns state, serializes
  operations, ignores late results and turns restore failures into a
  recoverable error state.
- The adapter is injected from the composition root
  (`src/containers/composition/createAuthAdapter.ts`), chosen by
  `VITE_AUTH_PROVIDER`. The demo adapter lives in `src/demo` and exists only
  in demo builds; `src/auth/adapters/session.ts` is the reference real
  adapter (HttpOnly cookie session).
- Identity changes clear the query cache.
- Migration: `docs/migration-notes.md`; how-to:
  `docs/recipes/real-auth-adapter.md`.
