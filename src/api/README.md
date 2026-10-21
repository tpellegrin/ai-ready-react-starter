# API layer

Shared HTTP and server-state plumbing. Feature endpoints live in their
feature (`src/features/<name>/api.ts`), not here.

- `http/` — `createHttpClient` (base URL, JSON, credentials, `AbortSignal`,
  empty bodies via `emptyResponse`), `ApiError` with kinds `network`,
  `aborted`, `http`, `parse`, `schema`, `isRetryableError`,
  `getFieldErrors` (422 field codes) and `getErrorMessageKey` (error → i18n
  key).
- `client.ts` — `apiClient`, configured from `appConfig.apiBaseUrl`.
- `queryClient.ts` — `createQueryClient()` with the app's defaults (bounded
  retries for retryable errors only, no mutation retries) and
  `resetSessionCache()` used when the signed-in user changes.

Rules:

- Every request names the Zod schema its response must match.
- Pass the query's `signal` so cancellation aborts the request.
- Query keys belong to the feature that owns the data.

See `docs/recipes/data-and-forms.md` and ADR 0011.
