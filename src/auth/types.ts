import { z } from 'zod';

/**
 * Signed-in user as the UI sees it. Adapters must produce this shape from
 * their own source (API payload, SDK object) and validate it with userSchema
 * when the source is untrusted.
 */
export const userSchema = z.object({
  id: z.string().min(1),
  email: z.string(),
  name: z.string().optional(),
  needsOnboarding: z.boolean(),
});
export type User = z.infer<typeof userSchema>;

export type SignInCredentials = {
  email: string;
  password: string;
};

/**
 * Contract for authentication adapters (v3, see docs/decisions/0003 and
 * docs/session-lifecycle.md).
 *
 * Adapters perform side effects and return results; AuthProvider owns the
 * session state, runs calls one at a time and bounds each with a deadline.
 * Every call receives an AbortSignal: it aborts when the call's deadline
 * passes or the provider stops (unmount, adapter replaced) — pass it to your
 * HTTP client or SDK. Keep credentials where the provider puts them (ideally
 * HttpOnly cookies managed by the server) — never in app-readable storage.
 */
export interface AuthAdapter {
  /**
   * Resolve the current session: the user, or null when there is none.
   * Reject only when the session could not be checked (network, server,
   * timeout); the provider then keeps what it knew.
   */
  restoreSession: (signal: AbortSignal) => Promise<User | null>;
  /** Reject with AuthError('invalid_credentials') for bad credentials. */
  signIn: (
    credentials: SignInCredentials,
    signal: AbortSignal,
  ) => Promise<User>;
  /**
   * Resolve once the server-side session is terminated (or was already
   * gone). Reject when that could not be confirmed: the provider keeps the
   * session, because it may still be valid on the server.
   */
  signOut: (signal: AbortSignal) => Promise<void>;
  /** Reject with AuthError('unauthenticated') when there is no session. */
  completeOnboarding: (signal: AbortSignal) => Promise<User>;
}

export type AuthErrorCode =
  | 'invalid_credentials'
  /** The server has no session for this request (it expired or was revoked). */
  | 'unauthenticated'
  /** The operation exceeded AuthProvider's deadline. */
  | 'timeout'
  | 'unknown';

/** Expected auth failures. UI maps them to copy with getAuthErrorMessageKey. */
export class AuthError extends Error {
  readonly code: AuthErrorCode;

  constructor(code: AuthErrorCode, options?: { cause?: unknown }) {
    super(`Authentication failed: ${code}`, options);
    this.name = 'AuthError';
    this.code = code;
  }
}

export const isAuthError = (
  error: unknown,
  code?: AuthErrorCode,
): error is AuthError =>
  error instanceof AuthError && (code === undefined || error.code === code);

export type AuthStatus =
  | 'initializing'
  | 'authenticated'
  | 'unauthenticated'
  | 'error';

/** Why the previous session ended: shown on sign-in ("expired"). */
export type SessionEndReason = 'signedOut' | 'expired';

export interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  /** status === 'authenticated' */
  isAuthenticated: boolean;
  /** status !== 'initializing' */
  isInitialized: boolean;
  /** Why the session could not be restored (status === 'error'). */
  error: unknown;
  /** How the previous session ended; null until one ends and after sign-in. */
  sessionEndReason: SessionEndReason | null;
  signIn: (credentials: SignInCredentials) => Promise<void>;
  /**
   * Ends the session on the server, then locally. Rejects — and keeps the
   * session — when the server could not confirm it (show the error, retry).
   */
  signOut: () => Promise<void>;
  /** Re-run startup restoration (the "Try again" of a failed start). */
  restoreSession: () => Promise<void>;
  /**
   * Re-check a signed-in session in the background (e.g. after an API 401).
   * No session on the server → the session ends as "expired". The check
   * itself failing (network, timeout) keeps the session and rejects.
   * Concurrent calls share one check.
   */
  verifySession: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
}
