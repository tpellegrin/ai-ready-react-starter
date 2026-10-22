# Authentication

The authentication boundary. The rest of the app uses `useAuth()` only.

- `types.ts` — `User` (`userSchema`), the `AuthAdapter` contract (v3:
  adapters return results and receive an `AbortSignal`; the provider owns
  state), `AuthError` (`isAuthError`), `AuthContextValue`.
- `AuthProvider.tsx` — session state (`initializing`, `authenticated`,
  `unauthenticated`, `error`): one queue per adapter for every call, each
  with a deadline; late and stale results ignored; recoverable restore
  errors; `verifySession()` after API 401s; `onIdentityChange` for cache
  isolation.
- `messages.ts` — auth errors → i18n keys (`getAuthErrorMessageKey`).
- `adapters/session.ts` — reference adapter for an HttpOnly cookie session
  (with CSRF token hand-off).

<!-- starter:demo-start -->

- The demo adapter lives in `src/demo/auth` (demo builds only).

<!-- starter:demo-end -->

Rules:

- Adapters are created in the composition root
  (`src/containers/composition/createAuthAdapter.ts`) from
  `VITE_AUTH_PROVIDER`; never construct one in a view.
- Only adapters touch auth storage (lint-enforced); never store tokens in
  app-readable storage.
- Client-side auth drives the UI only; the server authorizes requests.

Failure policy and deployment (cookies, CORS, CSRF):
`docs/session-lifecycle.md`. Add a provider:
`docs/recipes/real-auth-adapter.md`.
