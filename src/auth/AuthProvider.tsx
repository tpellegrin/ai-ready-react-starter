import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { runDetached } from 'utils/async';

import {
  AuthError,
  isAuthError,
  type AuthAdapter,
  type AuthContextValue,
  type AuthStatus,
  type SessionEndReason,
  type SignInCredentials,
  type User,
} from './types';

export const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Longest an adapter call may take before it fails with
 * AuthError('timeout') and the queue moves on. A safety net above the HTTP
 * client's own request timeout (api/client.ts), which normally fires first.
 */
export const DEFAULT_OPERATION_TIMEOUT_MS = 30_000;

type SessionState = {
  status: AuthStatus;
  user: User | null;
  error: unknown;
  endReason: SessionEndReason | null;
};

const INITIAL_STATE: SessionState = {
  status: 'initializing',
  user: null,
  error: null,
  endReason: null,
};

/**
 * One adapter, from mount (or adapter change) until unmount (or the next
 * adapter). Its operations run one at a time; when it ends, its controller
 * aborts and every pending or late result of it is ignored.
 */
type Generation = {
  adapter: AuthAdapter;
  controller: AbortController;
  tail: Promise<unknown>;
};

type Outcome<T> = { stale: true } | { stale: false; value: T };

const STALE = { stale: true } as const;

/**
 * Runs one adapter call with its own signal (aborted by the deadline and by
 * the generation ending). Resolves `stale` when the generation ended first;
 * otherwise resolves the value or rejects with the call's error.
 */
const runOperation = async <T,>(
  generation: Generation,
  operation: (adapter: AuthAdapter, signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
): Promise<Outcome<T>> => {
  const ended = generation.controller.signal;
  if (ended.aborted) return STALE;

  const controller = new AbortController();
  const cleanups: Array<() => void> = [];
  try {
    return await new Promise<Outcome<T>>((resolve, reject) => {
      const onEnded = () => {
        controller.abort(ended.reason);
        resolve(STALE);
      };
      ended.addEventListener('abort', onEnded, { once: true });
      cleanups.push(() => ended.removeEventListener('abort', onEnded));

      const timer = setTimeout(() => {
        const error = new AuthError('timeout');
        controller.abort(error);
        reject(error);
      }, timeoutMs);
      cleanups.push(() => clearTimeout(timer));

      new Promise<T>((started) => {
        started(operation(generation.adapter, controller.signal));
      }).then(
        (value) => resolve(ended.aborted ? STALE : { stale: false, value }),
        (error: unknown) =>
          ended.aborted
            ? resolve(STALE)
            : reject(
                error instanceof Error
                  ? error
                  : new AuthError('unknown', { cause: error }),
              ),
      );
    });
  } finally {
    for (const cleanup of cleanups) cleanup();
  }
};

export type AuthProviderProps = {
  /** Chosen by the composition root (src/containers/composition). */
  adapter: AuthAdapter;
  /**
   * Called synchronously whenever the signed-in identity changes (sign-in,
   * sign-out, expiry, a different user restored), before the new state
   * renders. The app uses it to cancel and clear user-scoped query caches.
   */
  onIdentityChange?:
    | ((next: User | null, previous: User | null) => void)
    | undefined;
  /** Deadline per adapter call (default DEFAULT_OPERATION_TIMEOUT_MS). */
  operationTimeoutMs?: number | undefined;
  children: ReactNode;
};

/**
 * Owns the session state and exposes it through useAuth.
 *
 * Guarantees (covered by AuthProvider.test.tsx; policy in
 * docs/session-lifecycle.md):
 * - Every adapter call — the initial restore included — runs in one queue,
 *   one at a time, in call order.
 * - Each call has a deadline: a call that never settles fails with
 *   AuthError('timeout') and cannot block the queue.
 * - Replacing the adapter or unmounting ends the current generation: its
 *   in-flight call is aborted, its queued calls never start, its late
 *   results are ignored, and the new adapter does not wait for any of them.
 * - A failed startup restore becomes `status: 'error'` (never an unhandled
 *   rejection); `restoreSession()` retries.
 * - `signOut` ends the local session only after the adapter confirms it.
 * - `verifySession` never logs out because a check failed; only a server
 *   answer of "no session" ends the session (as "expired").
 *
 * Client-side auth state only drives the UI. The server must authorize every
 * request.
 */
export const AuthProvider = ({
  adapter,
  onIdentityChange,
  operationTimeoutMs = DEFAULT_OPERATION_TIMEOUT_MS,
  children,
}: AuthProviderProps) => {
  const [state, setState] = useState<SessionState>(INITIAL_STATE);

  // Reset synchronously when the adapter changes (no stale user renders).
  const [currentAdapter, setCurrentAdapter] = useState(adapter);
  if (currentAdapter !== adapter) {
    setCurrentAdapter(adapter);
    setState(INITIAL_STATE);
  }

  const userRef = useRef<User | null>(null);
  const statusRef = useRef<AuthStatus>(INITIAL_STATE.status);
  const generationRef = useRef<Generation | null>(null);
  const verificationRef = useRef<Promise<void> | null>(null);
  const timeoutRef = useRef(operationTimeoutMs);
  const onIdentityChangeRef = useRef(onIdentityChange);
  useEffect(() => {
    timeoutRef.current = operationTimeoutMs;
    onIdentityChangeRef.current = onIdentityChange;
  }, [operationTimeoutMs, onIdentityChange]);

  const update = useCallback((next: SessionState) => {
    const previous = userRef.current;
    if (previous?.id !== next.user?.id) {
      onIdentityChangeRef.current?.(next.user, previous);
    }
    userRef.current = next.user;
    statusRef.current = next.status;
    setState(next);
  }, []);

  const commitUser = useCallback(
    (user: User) =>
      update({ status: 'authenticated', user, error: null, endReason: null }),
    [update],
  );

  const endSession = useCallback(
    (endReason: SessionEndReason | null) =>
      update({ status: 'unauthenticated', user: null, error: null, endReason }),
    [update],
  );

  /** Queue an adapter call on the current generation. */
  const enqueue = useCallback(
    <T,>(
      operation: (adapter: AuthAdapter, signal: AbortSignal) => Promise<T>,
    ): Promise<Outcome<T>> => {
      const generation = generationRef.current;
      if (!generation) return Promise.resolve(STALE);
      const task = generation.tail.then(() =>
        runOperation(generation, operation, timeoutRef.current),
      );
      generation.tail = task.catch(() => undefined);
      return task;
    },
    [],
  );

  /** Startup restore (initial, or a retry): failures become status 'error'. */
  const restore = useCallback(async () => {
    try {
      const outcome = await enqueue((current, signal) =>
        current.restoreSession(signal),
      );
      if (outcome.stale) return;
      if (outcome.value) commitUser(outcome.value);
      else endSession(null);
    } catch (error) {
      update({ status: 'error', user: null, error, endReason: null });
    }
  }, [enqueue, commitUser, endSession, update]);

  // A generation per adapter (and per mount: Strict Mode's replay ends the
  // first one). Its first call is the initial restore.
  useEffect(() => {
    const generation: Generation = {
      adapter,
      controller: new AbortController(),
      tail: Promise.resolve(),
    };
    generationRef.current = generation;
    verificationRef.current = null;
    statusRef.current = 'initializing';
    runDetached(restore());
    return () => {
      generation.controller.abort();
      if (generationRef.current === generation) generationRef.current = null;
    };
  }, [adapter, restore]);

  const restoreSession = useCallback(async () => {
    statusRef.current = 'initializing';
    setState((previous) => ({ ...previous, status: 'initializing' }));
    await restore();
  }, [restore]);

  const verifySession = useCallback(() => {
    if (statusRef.current !== 'authenticated') return Promise.resolve();
    if (verificationRef.current) return verificationRef.current;
    const verification = (async () => {
      const outcome = await enqueue((current, signal) =>
        current.restoreSession(signal),
      );
      if (outcome.stale) return;
      if (outcome.value) commitUser(outcome.value);
      else endSession('expired');
    })().finally(() => {
      if (verificationRef.current === verification) {
        verificationRef.current = null;
      }
    });
    verificationRef.current = verification;
    return verification;
  }, [enqueue, commitUser, endSession]);

  const signIn = useCallback(
    async (credentials: SignInCredentials) => {
      const outcome = await enqueue((current, signal) =>
        current.signIn(credentials, signal),
      );
      if (!outcome.stale) commitUser(outcome.value);
    },
    [enqueue, commitUser],
  );

  const signOut = useCallback(async () => {
    const outcome = await enqueue((current, signal) => current.signOut(signal));
    if (!outcome.stale) endSession('signedOut');
  }, [enqueue, endSession]);

  const completeOnboarding = useCallback(async () => {
    try {
      const outcome = await enqueue((current, signal) =>
        current.completeOnboarding(signal),
      );
      if (!outcome.stale) commitUser(outcome.value);
    } catch (error) {
      // The server no longer has the session: end it like an expiry.
      if (isAuthError(error, 'unauthenticated')) endSession('expired');
      throw error;
    }
  }, [enqueue, commitUser, endSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status: state.status,
      user: state.user,
      error: state.error,
      sessionEndReason: state.endReason,
      isAuthenticated: state.status === 'authenticated',
      isInitialized: state.status !== 'initializing',
      signIn,
      signOut,
      restoreSession,
      verifySession,
      completeOnboarding,
    }),
    [state, signIn, signOut, restoreSession, verifySession, completeOnboarding],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
