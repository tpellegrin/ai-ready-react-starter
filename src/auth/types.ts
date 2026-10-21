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
 * Contract for authentication adapters (v2, see docs/decisions/0003).
 *
 * Adapters perform side effects and return results; AuthProvider owns the
 * session state. Keep credentials where the provider puts them (ideally
 * HttpOnly cookies managed by the server) — never in app-readable storage.
 */
export interface AuthAdapter {
  /**
   * Resolve the current session: the user, or null when signed out.
   * Reject only for unexpected failures (network/server); abort when `signal`
   * aborts.
   */
  restoreSession: (signal: AbortSignal) => Promise<User | null>;
  /** Reject with AuthError('invalid_credentials') for bad credentials. */
  signIn: (credentials: SignInCredentials) => Promise<User>;
  signOut: () => Promise<void>;
  completeOnboarding: () => Promise<User>;
}

export type AuthErrorCode =
  | 'invalid_credentials'
  | 'unauthenticated'
  | 'unknown';

/** Expected auth failures. UI maps `code` to i18n keys (never shows `message`). */
export class AuthError extends Error {
  readonly code: AuthErrorCode;

  constructor(code: AuthErrorCode, options?: { cause?: unknown }) {
    super(`Authentication failed: ${code}`, options);
    this.name = 'AuthError';
    this.code = code;
  }
}

export type AuthStatus =
  | 'initializing'
  | 'authenticated'
  | 'unauthenticated'
  | 'error';

export interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  /** status === 'authenticated' */
  isAuthenticated: boolean;
  /** status !== 'initializing' */
  isInitialized: boolean;
  /** Why the last session restore failed (status === 'error'). */
  error: unknown;
  signIn: (credentials: SignInCredentials) => Promise<void>;
  /** Clears the local session even if the adapter call fails (then rethrows). */
  signOut: () => Promise<void>;
  /** Re-run session restoration (e.g. a "Try again" button). */
  restoreSession: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
}
