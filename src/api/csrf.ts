import type { HttpMethod } from './http';

/** Header the reference session contract uses for the CSRF token. */
export const CSRF_HEADER = 'X-CSRF-Token';

const UNSAFE_METHODS: ReadonlySet<HttpMethod> = new Set([
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
]);

export type CsrfToken = {
  /** Set by the session adapter from the session response; null clears it. */
  set: (token: string | null) => void;
  /** Headers for one request: the token on unsafe methods only. */
  headers: (request: { method: HttpMethod }) => Record<string, string>;
};

/**
 * In-memory CSRF token for cookie sessions (docs/session-lifecycle.md).
 * The server returns it with the session; the HTTP client sends it back on
 * state-changing requests. It is never persisted: after a reload, restoring
 * the session returns it again.
 */
export const createCsrfToken = (): CsrfToken => {
  let token: string | null = null;
  return {
    set: (next) => {
      token = next;
    },
    headers: ({ method }) =>
      token && UNSAFE_METHODS.has(method) ? { [CSRF_HEADER]: token } : {},
  };
};
