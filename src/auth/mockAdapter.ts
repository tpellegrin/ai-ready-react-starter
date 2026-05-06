// DEMO: Replace or remove this file when adopting the boilerplate. See docs/adoption.md.
import { AuthAdapter, User } from './types';

const MOCK_USER: User = {
  id: '1',
  email: 'demo@example.com',
  name: 'Demo User',
  needsOnboarding: true,
};

const STORAGE_KEY = 'boilerplate_auth_session';

/**
 * Demo-only implementation of the AuthAdapter.
 *
 * This adapter exists so the boilerplate can demonstrate auth flows without
 * requiring a real backend. Production apps should replace this with a real
 * adapter while keeping the provider/hook contract stable.
 */
export const createMockAuthAdapter = (onUpdate: () => void): AuthAdapter => {
  let user: User | null = null;

  const adapter: AuthAdapter = {
    get user() {
      return user;
    },
    get isAuthenticated() {
      return !!user;
    },
    signIn: async (credentials) => {
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 800));

      if (credentials.password === 'fail') {
        throw new Error('Invalid credentials');
      }

      user = MOCK_USER;
      localStorage.setItem(STORAGE_KEY, 'true');
      onUpdate();
    },
    signOut: async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
      user = null;
      localStorage.removeItem(STORAGE_KEY);
      onUpdate();
    },
    restoreSession: async () => {
      const hasSession = localStorage.getItem(STORAGE_KEY);
      await new Promise((resolve) => setTimeout(resolve, 0));
      if (hasSession) {
        user = MOCK_USER;
        onUpdate();
      }
    },
    completeOnboarding: async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
      if (user) {
        user = { ...user, needsOnboarding: false };
        onUpdate();
      }
    },
  };

  return adapter;
};
