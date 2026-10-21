import { z } from 'zod';

import { emptyResponse, isApiError, type HttpClient } from 'api/http';

import { AuthError, userSchema, type AuthAdapter } from '../types';

const sessionResponseSchema = z.object({ user: userSchema });

/**
 * Reference AuthAdapter for a server-managed cookie session.
 *
 * The server sets/clears an HttpOnly session cookie; the browser never sees a
 * token, so nothing is written to localStorage. Contract (adapt or replace the
 * adapter if your backend differs — see docs/recipes/real-auth-adapter.md):
 *
 *   GET    /session             200 { user } | 401 when signed out
 *   POST   /session             { email, password } → 200 { user } | 401/422 invalid
 *   DELETE /session             204
 *   POST   /session/onboarding  200 { user } with needsOnboarding=false
 */
export const createSessionAuthAdapter = (http: HttpClient): AuthAdapter => ({
  async restoreSession(signal) {
    try {
      const { user } = await http.request({
        path: '/session',
        schema: sessionResponseSchema,
        signal,
      });
      return user;
    } catch (error) {
      if (isApiError(error) && error.status === 401) return null;
      throw error;
    }
  },

  async signIn(credentials) {
    try {
      const { user } = await http.request({
        method: 'POST',
        path: '/session',
        body: credentials,
        schema: sessionResponseSchema,
      });
      return user;
    } catch (error) {
      if (isApiError(error) && (error.status === 401 || error.status === 422)) {
        throw new AuthError('invalid_credentials', { cause: error });
      }
      throw error;
    }
  },

  async signOut() {
    await http.request({
      method: 'DELETE',
      path: '/session',
      schema: emptyResponse,
    });
  },

  async completeOnboarding() {
    const { user } = await http.request({
      method: 'POST',
      path: '/session/onboarding',
      schema: sessionResponseSchema,
    });
    return user;
  },
});
