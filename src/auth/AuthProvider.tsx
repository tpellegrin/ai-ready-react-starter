import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
} from 'react';
import { AuthAdapter } from './types';
import { createMockAuthAdapter } from './mockAdapter';

interface AuthContextValue extends AuthAdapter {
  isInitialized: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * AuthProvider manages the authentication state and provides it via `useAuth`.
 *
 * Maintainer/AI note:
 * This component uses an AuthAdapter to keep the authentication logic decoupled.
 * Production apps should replace the `mockAdapter` with a real implementation
 * while keeping the `AuthAdapter` contract and the `useAuth` hook stable.
 */
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [tick, setTick] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);

  // forceUpdate to react to adapter internal state changes
  const forceUpdate = () => setTick((t) => t + 1);

  // In a real app, you might inject a different adapter based on config
  const adapter = useMemo(() => createMockAuthAdapter(forceUpdate), []);

  useEffect(() => {
    adapter.restoreSession().finally(() => {
      setIsInitialized(true);
    });
  }, [adapter]);

  const value = useMemo(() => {
    // Access tick to satisfy exhaustive-deps, as we need to re-render when the adapter updates
    void tick;
    return {
      user: adapter.user,
      isAuthenticated: adapter.isAuthenticated,
      signIn: adapter.signIn,
      signOut: adapter.signOut,
      restoreSession: adapter.restoreSession,
      completeOnboarding: adapter.completeOnboarding,
      isInitialized,
    };
  }, [
    adapter.user,
    adapter.isAuthenticated,
    adapter.signIn,
    adapter.signOut,
    adapter.restoreSession,
    adapter.completeOnboarding,
    isInitialized,
    tick,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
