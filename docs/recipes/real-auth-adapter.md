# Recipe: connect real authentication

The app talks to authentication only through an `AuthAdapter`
(`src/auth/types.ts`). `AuthProvider` owns session state, runs every call in
one queue with a deadline, ignores late results and clears the query cache
when the user changes; adapters only perform side effects and return
results. What the app does on each failure, and what the backend must do
(cookies, CORS, CSRF): [session-lifecycle](../session-lifecycle.md).

```ts
export interface AuthAdapter {
  // null = signed out; reject only when the session could not be checked
  restoreSession: (signal: AbortSignal) => Promise<User | null>;
  // AuthError('invalid_credentials') for bad credentials
  signIn: (
    credentials: SignInCredentials,
    signal: AbortSignal,
  ) => Promise<User>;
  // resolve once the server session is gone; reject if that is not confirmed
  signOut: (signal: AbortSignal) => Promise<void>;
  // AuthError('unauthenticated') when there is no session
  completeOnboarding: (signal: AbortSignal) => Promise<User>;
}
```

Pass `signal` to every request: it aborts on the provider's deadline and on
unmount.

## Option A: your API uses a cookie session

Use the reference adapter (`src/auth/adapters/session.ts`) if your backend
implements this contract, or adapt the paths and payloads:

```
GET    /session             200 { user, csrfToken? } | 401 when signed out
POST   /session             { email, password } → 200 { user, csrfToken? } | 401/422 invalid
DELETE /session             204 (401: already signed out)
POST   /session/onboarding  200 { user, csrfToken? } with needsOnboarding=false | 401 no session
```

1. Set `VITE_AUTH_PROVIDER=session` and `VITE_API_BASE_URL`
   ([configuration](../configuration.md)). Same-origin is simplest;
   cross-origin needs credentialed CORS
   ([deployment arrangements](../session-lifecycle.md#deployment-arrangements)).
2. Map your user payload to `User` with `userSchema` (add fields there if
   the app needs them).
3. If your server issues a CSRF token, return it as `csrfToken`; the adapter
   hands it to `apiClient`, which sends `X-CSRF-Token` on unsafe methods
   ([CSRF](../session-lifecycle.md#csrf)).
4. In development, `src/mocks/session.ts` emulates this contract in MSW
   (CSRF included), so `pnpm start` works before the backend exists.

## Option B: an auth SDK (OIDC, hosted provider)

1. Create `src/auth/adapters/<provider>.ts` implementing `AuthAdapter` with
   the SDK. Keep tokens where the SDK keeps them; browser storage is
   lint-restricted to adapters, and app-readable token storage is still a
   bad idea (`SECURITY.md`).
2. Validate whatever the SDK returns with `userSchema` before returning it.
3. Register it in the composition root:
   - add the name to `AUTH_PROVIDERS` in `src/config/schema.ts`;
   - add a `case` in `src/containers/composition/createAuthAdapter.ts`.
     Load a heavy SDK lazily (`return import('auth/adapters/oidc').then(...)`).
4. Redirect-based sign-in: start the redirect in `signIn` and resolve the
   session in `restoreSession` when the app reloads on the callback route.
5. Bearer tokens for API calls: give the HTTP client a `headers` function
   that reads the SDK's token (`src/api/client.ts`).

## Tests

- Adapter unit tests against MSW, like `src/auth/adapters/session.test.ts`
  (success, 401 → `null`/`AuthError`, failures, abort, CSRF).
- Everything above the adapter is tested with `createFakeAuthAdapter`
  (`src/test/auth.ts`); provider guarantees live in
  `src/auth/AuthProvider.test.tsx`.

## Then

<!-- starter:demo-start -->

- `pnpm adopt --remove-demo` removes the demo adapter and its config option.

<!-- starter:demo-end -->

- Client-side auth only drives the UI: the server authorizes every request.
