# Recipe: connect real authentication

The app talks to authentication only through an `AuthAdapter`
(`src/auth/types.ts`). `AuthProvider` owns session state, runs operations one
at a time, ignores late results and clears the query cache when the user
changes; adapters only perform side effects and return results.

```ts
export interface AuthAdapter {
  restoreSession: (signal: AbortSignal) => Promise<User | null>; // null = signed out
  signIn: (credentials: SignInCredentials) => Promise<User>; // AuthError('invalid_credentials') for bad credentials
  signOut: () => Promise<void>;
  completeOnboarding: () => Promise<User>;
}
```

## Option A: your API uses a cookie session

Use the reference adapter as is (`src/auth/adapters/session.ts`) if your
backend implements this contract, or adapt the paths/payloads:

```
GET    /session             200 { user } | 401 when signed out
POST   /session             { email, password } → 200 { user } | 401/422 invalid
DELETE /session             204
POST   /session/onboarding  200 { user } with needsOnboarding=false
```

1. Set `VITE_AUTH_PROVIDER=session` and `VITE_API_BASE_URL` (see
   [configuration](../configuration.md)). Cross-origin APIs must allow
   credentialed CORS for your app origin (the client sends
   `credentials: 'include'`).
2. Map your user payload to `User` with `userSchema` (add fields there if the
   app needs them).
3. In development, `src/mocks/session.ts` emulates this contract in MSW, so
   `pnpm start` works before the backend exists.

## Option B: an auth SDK (OIDC, hosted provider)

1. Create `src/auth/adapters/<provider>.ts` that implements `AuthAdapter`
   with the SDK. Keep tokens where the SDK keeps them; never write them to
   app-readable storage yourself (only adapters may touch auth storage).
2. Validate whatever the SDK returns with `userSchema` before returning it.
3. Register it in the composition root:
   - add the name to `AUTH_PROVIDERS` in `src/config/schema.ts`;
   - add a `case` in `src/containers/composition/createAuthAdapter.ts`. Load a
     heavy SDK lazily (`return import('auth/adapters/oidc').then(...)`).
4. Redirect-based sign-in: start the redirect in `signIn` and resolve the
   session in `restoreSession` when the app reloads on the callback route.

## Tests

- Adapter unit tests against MSW, like `src/auth/adapters/session.test.ts`
  (success, 401 → null/`AuthError`, network failure, abort).
- Everything above the adapter is tested with `createFakeAuthAdapter`
  (`src/test/auth.ts`), so views and routing tests do not change.

## Then

- `pnpm adopt --remove-demo` removes the demo adapter and its config option.
- Remember that client-side auth only drives the UI: the server authorizes
  every request.
