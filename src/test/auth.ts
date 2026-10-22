import { vi } from 'vitest';

import {
  AuthError,
  type AuthAdapter,
  type AuthContextValue,
  type SignInCredentials,
  type User,
} from 'auth/types';

export const testUser: User = {
  id: 'user-1',
  email: 'ada@example.com',
  name: 'Ada',
  needsOnboarding: false,
};

/**
 * In-memory AuthAdapter for tests. Starts signed out unless `user` is given.
 * Password "wrong" is rejected as invalid credentials. Calls ignore their
 * AbortSignal; override a method (`mockReturnValueOnce`) to test hangs,
 * failures or cancellation.
 */
export const createFakeAuthAdapter = ({
  user = null,
  needsOnboarding = false,
}: {
  user?: User | null;
  needsOnboarding?: boolean;
} = {}) => {
  let current: User | null = user;
  return {
    restoreSession: vi.fn((_signal: AbortSignal) => Promise.resolve(current)),
    signIn: vi.fn(
      ({ email, password }: SignInCredentials, _signal: AbortSignal) => {
        if (password === 'wrong') {
          return Promise.reject(new AuthError('invalid_credentials'));
        }
        current = { id: `user:${email}`, email, needsOnboarding };
        return Promise.resolve(current);
      },
    ),
    signOut: vi.fn((_signal: AbortSignal) => {
      current = null;
      return Promise.resolve();
    }),
    completeOnboarding: vi.fn((_signal: AbortSignal) => {
      if (!current) return Promise.reject(new AuthError('unauthenticated'));
      current = { ...current, needsOnboarding: false };
      return Promise.resolve(current);
    }),
  } satisfies AuthAdapter;
};

/**
 * Typed `useAuth()` value for tests that mock the hook. Defaults to an
 * initialized guest; override only what the test is about.
 */
export const createAuthValue = (
  overrides: Partial<AuthContextValue> = {},
): AuthContextValue => {
  const status =
    overrides.status ?? (overrides.user ? 'authenticated' : 'unauthenticated');
  return {
    status,
    user: null,
    error: null,
    sessionEndReason: null,
    isAuthenticated: status === 'authenticated',
    isInitialized: status !== 'initializing',
    signIn: vi.fn(() => Promise.resolve()),
    signOut: vi.fn(() => Promise.resolve()),
    restoreSession: vi.fn(() => Promise.resolve()),
    verifySession: vi.fn(() => Promise.resolve()),
    completeOnboarding: vi.fn(() => Promise.resolve()),
    ...overrides,
  };
};
