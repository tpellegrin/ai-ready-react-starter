# 0011 — HTTP client, runtime schemas and feature-owned server state

## Status

Accepted (2026-10). Amends [0004](0004-query-api-layer.md).

## Decision

- A thin `fetch` client (`src/api/http`) owns base URL, JSON, credentials,
  `AbortSignal`, empty bodies and error normalization (`ApiError` kinds:
  network, aborted, http, parse, schema). Every request names the Zod schema
  its response must satisfy.
- TanStack Query stays the server-state layer. Query keys, `queryOptions` and
  mutations are owned by each feature (`features/<name>/queries.ts`); the
  global `queryKeys` registry and `demoApi` are removed.
- Retries: queries retry only retryable failures (network, 408, 429, 5xx) at
  most twice; mutations never retry.
- The session boundary clears the query cache when the user changes
  (`onIdentityChange` → `resetSessionCache`), cancelling in-flight queries.

## Why

Unvalidated responses fail far from their cause; a global key registry
couples features; retrying 4xx/validation errors wastes requests and delays
feedback; cached data from one user must not render for the next.

## Consequences

- Malformed payloads surface as recoverable error states, not crashes.
- `getErrorMessageKey(error)` gives every failure localized copy.
- Tests run the real client against MSW; unhandled requests fail tests.

## Change guidance

Follow `docs/recipes/data-and-forms.md`. Keep business mapping in feature
`model.ts`/`api.ts`, not in the client.

## Amendment (2026-10): timeouts, 401 policy, CSRF

- Requests time out (`timeoutMs`; the app client uses 15 s) with a distinct
  `timeout` kind; the caller's signal still yields `aborted`. Timeouts are
  not retried automatically. Why: a hung request left the UI loading forever.
- The `headers` hook receives `{ method, path }`; the app client uses it to
  send the session's CSRF token on unsafe methods (`src/api/csrf.ts`).
- A 401 from a query or mutation triggers a session check instead of a
  logout (`isUnauthenticatedError`, `SessionMonitor`); the HTTP layer stays
  free of React and session state.
- Raw `fetch` (and XHR, WebSocket, EventSource, `sendBeacon`) outside
  `src/api/http` is a lint error.
