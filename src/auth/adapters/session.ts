import { z } from 'zod';

import type { CsrfToken } from 'api/csrf';
import {
  emptyResponse,
  isApiError,
  isUnauthenticatedError,
  type HttpClient,
} from 'api/http';

import { AuthError, userSchema, type AuthAdapter } from '../types';

const sessionResponseSchema = z.object({
  user: userSchema,
  /** Optional synchronizer token; sent back on unsafe requests. */
  csrfToken: z.string().min(1).optional(),
});

export type SessionAuthAdapterOptions = {
  /** Receives the session's CSRF token (api/client.ts `csrfToken`). */
  csrf?: Pick<CsrfToken, 'set'> | undefined;
};

/**
 * Reference AuthAdapter for a server-managed cookie session.
 *
 * The server sets/clears an HttpOnly session cookie; the browser never sees a
 * token, so nothing is written to app-readable storage. Contract (adapt or
 * replace the adapter if your backend differs — see
 * docs/recipes/real-auth-adapter.md and docs/session-lifecycle.md):
 *
 *   GET    /session             200 { user, csrfToken? } | 401 when signed out
 *   POST   /session             { email, password } → 200 { user, csrfToken? } | 401/422 invalid
 *   DELETE /session             204 (401: already signed out)
 *   POST   /session/onboarding  200 { user, csrfToken? } with needsOnboarding=false | 401 no session
 *
 * Every call passes AuthProvider's signal, so its deadline and unmounting
 * abort the request.
 */
export const createSessionAuthAdapter = (
  http: HttpClient,
  { csrf }: SessionAuthAdapterOptions = {},
): AuthAdapter => ({
  async restoreSession(signal) {
    try {
      const { user, csrfToken } = await http.request({
        path: '/session',
        schema: sessionResponseSchema,
        signal,
      });
      csrf?.set(csrfToken ?? null);
      return user;
    } catch (error) {
      if (isUnauthenticatedError(error)) {
        csrf?.set(null);
        return null;
      }
      throw error;
    }
  },

  async signIn(credentials, signal) {
    try {
      const { user, csrfToken } = await http.request({
        method: 'POST',
        path: '/session',
        body: credentials,
        schema: sessionResponseSchema,
        signal,
      });
      csrf?.set(csrfToken ?? null);
      return user;
    } catch (error) {
      if (isApiError(error) && (error.status === 401 || error.status === 422)) {
        throw new AuthError('invalid_credentials', { cause: error });
      }
      throw error;
    }
  },

  async signOut(signal) {
    try {
      await http.request({
        method: 'DELETE',
        path: '/session',
        schema: emptyResponse,
        signal,
      });
    } catch (error) {
      // No session on the server: the user is signed out already.
      if (!isUnauthenticatedError(error)) throw error;
    }
    csrf?.set(null);
  },

  async completeOnboarding(signal) {
    try {
      const { user, csrfToken } = await http.request({
        method: 'POST',
        path: '/session/onboarding',
        schema: sessionResponseSchema,
        signal,
      });
      if (csrfToken) csrf?.set(csrfToken);
      return user;
    } catch (error) {
      if (isUnauthenticatedError(error)) {
        throw new AuthError('unauthenticated', { cause: error });
      }
      throw error;
    }
  },
});
