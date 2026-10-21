import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import type {
  AuthAdapter,
  AuthContextValue,
  AuthStatus,
  SignInCredentials,
  User,
} from './types';

export const AuthContext = createContext<AuthContextValue | null>(null);

type SessionState = {
  status: AuthStatus;
  user: User | null;
  error: unknown;
};

const INITIAL_STATE: SessionState = {
  status: 'initializing',
  user: null,
  error: null,
};

export type AuthProviderProps = {
  /** Chosen by the composition root (src/containers/composition). */
  adapter: AuthAdapter;
  /**
   * Called synchronously whenever the signed-in identity changes (sign-in,
   * sign-out, a different user restored), before the new state renders. The
   * app uses it to cancel and clear user-scoped query caches.
   */
  onIdentityChange?:
    | ((next: User | null, previous: User | null) => void)
    | undefined;
  children: ReactNode;
};

/**
 * Owns the session state and exposes it through useAuth.
 *
 * Lifecycle guarantees (covered by AuthProvider.test.tsx):
 * - Operations run one at a time, in call order.
 * - Results that arrive after unmount or after the adapter changed are ignored.
 * - A rejected restore becomes `status: 'error'` (never an unhandled
 *   rejection); `restoreSession()` retries.
 * - signOut always clears the local session, even if the adapter fails.
 *
 * Client-side auth state only drives the UI. The server must authorize every
 * request.
 */
export const AuthProvider = ({
  adapter,
  onIdentityChange,
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
  const epochRef = useRef(0);
  const queueRef = useRef<Promise<unknown>>(Promise.resolve());
  const onIdentityChangeRef = useRef(onIdentityChange);
  useEffect(() => {
    onIdentityChangeRef.current = onIdentityChange;
  }, [onIdentityChange]);

  const commitUser = useCallback((user: User | null) => {
    const previous = userRef.current;
    if (previous?.id !== user?.id) {
      onIdentityChangeRef.current?.(user, previous);
    }
    userRef.current = user;
    setState({
      status: user ? 'authenticated' : 'unauthenticated',
      user,
      error: null,
    });
  }, []);

  const failRestore = useCallback((error: unknown) => {
    const previous = userRef.current;
    if (previous) onIdentityChangeRef.current?.(null, previous);
    userRef.current = null;
    setState({ status: 'error', user: null, error });
  }, []);

  /** Queue an operation; drop its outcome if the epoch moved on meanwhile. */
  const enqueue = useCallback(<T,>(operation: () => Promise<T>) => {
    const epoch = epochRef.current;
    const task = queueRef.current.then(operation);
    queueRef.current = task.catch(() => undefined);
    return {
      task,
      isCurrent: () => epoch === epochRef.current,
    };
  }, []);

  // Initial restore (and again whenever the adapter changes).
  useEffect(() => {
    const epoch = ++epochRef.current;
    const controller = new AbortController();
    const isCurrent = () => epoch === epochRef.current;

    adapter.restoreSession(controller.signal).then(
      (user) => {
        if (isCurrent()) commitUser(user);
      },
      (error: unknown) => {
        if (isCurrent()) failRestore(error);
      },
    );

    return () => {
      epochRef.current += 1;
      controller.abort();
    };
  }, [adapter, commitUser, failRestore]);

  const restoreSession = useCallback(async () => {
    setState((previous) => ({
      ...previous,
      status: 'initializing',
      error: null,
    }));
    const controller = new AbortController();
    const { task, isCurrent } = enqueue(() =>
      adapter.restoreSession(controller.signal),
    );
    try {
      const user = await task;
      if (isCurrent()) commitUser(user);
    } catch (error) {
      if (isCurrent()) failRestore(error);
    }
  }, [adapter, enqueue, commitUser, failRestore]);

  const signIn = useCallback(
    async (credentials: SignInCredentials) => {
      const { task, isCurrent } = enqueue(() => adapter.signIn(credentials));
      const user = await task;
      if (isCurrent()) commitUser(user);
    },
    [adapter, enqueue, commitUser],
  );

  const signOut = useCallback(async () => {
    const { task, isCurrent } = enqueue(() => adapter.signOut());
    try {
      await task;
    } finally {
      if (isCurrent()) commitUser(null);
    }
  }, [adapter, enqueue, commitUser]);

  const completeOnboarding = useCallback(async () => {
    const { task, isCurrent } = enqueue(() => adapter.completeOnboarding());
    const user = await task;
    if (isCurrent()) commitUser(user);
  }, [adapter, enqueue, commitUser]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status: state.status,
      user: state.user,
      error: state.error,
      isAuthenticated: state.status === 'authenticated',
      isInitialized: state.status !== 'initializing',
      signIn,
      signOut,
      restoreSession,
      completeOnboarding,
    }),
    [state, signIn, signOut, restoreSession, completeOnboarding],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
