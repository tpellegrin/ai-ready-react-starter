# Session lifecycle and the cookie-session arrangement

How the app keeps a session, what it does when something fails, and what
the backend and deployment must provide. The supported approach is a
**server-managed session in an HttpOnly cookie** (the reference adapter,
`src/auth/adapters/session.ts`); other providers plug in through the same
adapter contract (`docs/recipes/real-auth-adapter.md`).

## Who owns what

| Piece                                        | Owns                                                                                                                       |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Server                                       | The session (cookie), authorization of **every** request, CSRF protection, CORS                                            |
| Auth adapter (`src/auth/adapters`)           | Talking to the auth API; mapping answers to results (`User`, `null`) or `AuthError`s; handing the CSRF token to the client |
| `AuthProvider` (`src/auth/AuthProvider.tsx`) | Session state (`useAuth()`); one queue for every adapter call, each with a deadline; ignoring late or stale results        |
| `SessionMonitor` (`src/containers/session`)  | Turning an API 401 into a session check                                                                                    |
| HTTP client (`src/api`)                      | Timeouts, credentials, the CSRF header; it knows nothing about React or the session state                                  |
| `AppRouter`                                  | Which route group renders; destinations across sign-in and onboarding (`docs/routing.md`)                                  |

Client-side checks only drive the UI. Hiding a route is never authorization.

## Failure policy

| Situation                                                   | What the user sees                                                                                         | Session                                                                                                                  |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Startup check pending                                       | Loading (`AppLoading`)                                                                                     | Unknown: nothing is routed                                                                                               |
| Startup check fails (offline, 5xx, timeout)                 | "We couldn't check your session" with the reason and **Try again** (`SessionUnavailable`)                  | Unknown: nothing is routed until it succeeds                                                                             |
| A request hangs                                             | After 15 s (`API_TIMEOUT_MS`) the request fails with a timeout message and the region offers **Try again** | Unchanged                                                                                                                |
| An adapter call never settles                               | It fails after 30 s (`DEFAULT_OPERATION_TIMEOUT_MS`) with `AuthError('timeout')`; the queue moves on       | Unchanged (a hung startup check becomes the startup failure above)                                                       |
| Sign-in: wrong credentials                                  | "Invalid email or password" in the form                                                                    | Signed out                                                                                                               |
| Sign-in: network, server or timeout                         | The specific reason in the form; the form can be submitted again                                           | Signed out                                                                                                               |
| A query or mutation answers **401** while signed in         | The session is re-checked once (concurrent 401s share the check)                                           | **Server has no session** → ends as _expired_: caches cleared, sign-in for the same page with "Your session has expired" |
|                                                             |                                                                                                            | **Session still valid** → kept; the failed request shows its error in place                                              |
|                                                             |                                                                                                            | **Check fails** (offline, timeout) → kept; the request shows its error                                                   |
| **403**, 404, 409, 422, 5xx from an endpoint                | The region's error (or field errors for 422)                                                               | Never touched                                                                                                            |
| Sign-out succeeds (or the server says there was no session) | Guest pages; for a protected page, sign-in for it                                                          | Ended (caches cleared)                                                                                                   |
| Sign-out fails (offline, 5xx, timeout)                      | "We couldn't sign you out" next to the page heading; **Sign out** can be pressed again                     | **Kept**: the server session may still be valid, so the UI does not pretend it ended                                     |
| Completing onboarding fails                                 | The reason on the step; the button retries                                                                 | Kept (an `AuthError('unauthenticated')` instead ends it as _expired_)                                                    |

Why sign-out keeps the session on failure: with an HttpOnly cookie the
browser cannot delete the credential itself. Clearing only the local state
would show "signed out" while a reload would sign the user back in. Adapters
whose credentials do live in the browser (an SDK's token storage) can clear
them in `signOut` and resolve.

Retries: queries retry network errors, 408, 429 and 5xx at most twice;
timeouts are not retried automatically (the user already waited) and
mutations never are. Nothing retries a 401.

## Ordering guarantees

`AuthProvider` runs every adapter call — the startup restore included — in
one queue, in call order, each with its own `AbortSignal`:

- A late startup result can never overwrite a later sign-in.
- Unmounting or replacing the adapter ends the current _generation_: its
  call is aborted, queued calls never start, late results are ignored, and
  the new adapter does not wait for any of them. Under Strict Mode's effect
  replay, the first generation ends before it calls the adapter.
- `verifySession()` shares one check between concurrent callers and never
  logs out because the check itself failed.

These are tested in `src/auth/AuthProvider.test.tsx` independently of the
loading screen.

## Deployment arrangements

**Recommended: same origin.** Serve the API under the app's origin (e.g. a
reverse proxy routes `/api` to the backend) and set `VITE_API_BASE_URL=/api`.
No CORS, and the cookie can be host-only:

```
Set-Cookie: __Host-session=…; Path=/; Secure; HttpOnly; SameSite=Lax
```

**Same site, different origin** (`app.example.com` → `api.example.com`).
Cookies are first-party, but every request is cross-origin:

- The API answers credentialed CORS for the exact app origin:
  `Access-Control-Allow-Origin: https://app.example.com` (never `*`),
  `Access-Control-Allow-Credentials: true`,
  `Access-Control-Allow-Headers: Content-Type, X-CSRF-Token`,
  `Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE`, and a
  `Vary: Origin` header. JSON requests are preflighted; cache preflights with
  `Access-Control-Max-Age`.
- The cookie is `Secure; HttpOnly; SameSite=Lax` (host-only on the API host,
  or `Domain=example.com` if other subdomains need it).
- The client already sends `credentials: 'include'` (`src/api/client.ts`).

**Cross site** (`app.example.com` → `api.other.net`): avoid. The cookie must
be `SameSite=None; Secure`, and browsers increasingly block such third-party
cookies (Safari already does). Put the API behind the app's site (a proxy or
a backend-for-frontend) instead.

## CSRF

Cookies are sent automatically, so the server must reject forged
state-changing requests. Responsibilities:

- **Server (required):** check every unsafe method (POST, PUT, PATCH,
  DELETE) — a synchronizer token tied to the session, plus `SameSite=Lax`
  cookies and `Origin`/`Sec-Fetch-Site` verification as defense in depth.
  Keep GET free of side effects.
- **Client (provided):** when the session response includes `csrfToken`
  (`{ user, csrfToken }` from `GET`/`POST /session`), the session adapter
  hands it to `apiClient`, which sends it as `X-CSRF-Token` on unsafe
  methods only (`src/api/csrf.ts`). It lives in memory, never in storage;
  restoring the session after a reload returns it again. Signing out (or a
  401 on restore) clears it.
- Login CSRF is the server's concern too (e.g. origin checks on
  `POST /session`).

A backend using the double-submit-cookie pattern instead: return the token
in the session response as above, so the app never reads cookies (it cannot
read another origin's cookies anyway, and `document.cookie` access is
lint-restricted).

The mock backend (`src/mocks/session.ts`) issues a token and requires it on
its own unsafe endpoints, so development exercises the same path; feature
mocks do not check it.

## Integrating a real adapter

Implement `AuthAdapter` (`src/auth/types.ts`) and keep these semantics:

| Method                        | Resolve with                                   | Reject with                                                       |
| ----------------------------- | ---------------------------------------------- | ----------------------------------------------------------------- |
| `restoreSession(signal)`      | the `User`, or `null` when there is no session | anything else (network, 5xx, timeout): the app keeps what it knew |
| `signIn(credentials, signal)` | the `User`                                     | `AuthError('invalid_credentials')` for bad credentials            |
| `signOut(signal)`             | once the server session is gone (or was gone)  | when that could not be confirmed (the session is kept)            |
| `completeOnboarding(signal)`  | the updated `User`                             | `AuthError('unauthenticated')` when there is no session           |

Pass `signal` to every request (it carries the provider's deadline and
unmount). Validate SDK or API payloads with `userSchema`. For redirect-based
providers (OIDC), start the redirect in `signIn` and resolve the session in
`restoreSession` when the app reloads on the callback. Register the adapter
in `src/containers/composition/createAuthAdapter.ts`
(`docs/recipes/real-auth-adapter.md`).

Token-based APIs (`Authorization: Bearer`): give `createHttpClient` a
`headers` function that reads the token from the SDK; the 401 policy above
applies unchanged.

## Limits

- 401s are observed for requests made through TanStack Query (queries and
  mutations). Keep server state there; a raw `apiClient` call in an event
  handler handles its own errors.
- A destination kept through onboarding lives in memory: a full reload
  during onboarding falls back to home after it.
- There is no proactive session refresh or idle timeout; add one in the
  adapter if your backend needs it.
