# Authentication

The authentication boundary. The rest of the app uses `useAuth()` only.

- `types.ts` — `User` (`userSchema`), the `AuthAdapter` contract (v2:
  adapters return results, the provider owns state), `AuthError`,
  `AuthContextValue`.
- `AuthProvider.tsx` — session state machine (`initializing`,
  `authenticated`, `unauthenticated`, `error`): serialized operations, late
  results ignored, recoverable restore errors, `onIdentityChange` for cache
  isolation.
- `adapters/session.ts` — reference adapter for an HttpOnly cookie session.
- The demo adapter lives in `src/demo/auth` (demo builds only).

Rules:

- Adapters are created in the composition root
  (`src/containers/composition/createAuthAdapter.ts`) from
  `VITE_AUTH_PROVIDER`; never construct one in a view.
- Only adapters may touch auth storage; never store tokens in app-readable
  storage.
- Client-side auth drives the UI only; the server authorizes requests.

Add a provider: `docs/recipes/real-auth-adapter.md`.
