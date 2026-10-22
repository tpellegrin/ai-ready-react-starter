import { appConfig } from 'config';

import { createCsrfToken } from './csrf';
import { createHttpClient } from './http';

/**
 * Requests that get no response within this time fail with
 * ApiError('timeout'), so a hung server never leaves the UI loading forever.
 * Pass `timeoutMs` per request for slower endpoints.
 */
export const API_TIMEOUT_MS = 15_000;

/** The session's CSRF token (set by the session auth adapter). */
export const csrfToken = createCsrfToken();

/**
 * The application's HTTP client for its own API (VITE_API_BASE_URL).
 * `credentials: 'include'` lets cookie sessions work when the API is on a
 * different origin (the server must allow credentialed CORS); the CSRF
 * token goes out on unsafe methods. See docs/session-lifecycle.md.
 */
export const apiClient = createHttpClient({
  baseUrl: appConfig.apiBaseUrl,
  credentials: 'include',
  timeoutMs: API_TIMEOUT_MS,
  headers: csrfToken.headers,
});
