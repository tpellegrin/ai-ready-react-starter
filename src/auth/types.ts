export interface User {
  id: string;
  email: string;
  name?: string;
  needsOnboarding?: boolean;
}

/**
 * Contract for authentication adapters.
 *
 * Maintainer/AI note:
 * This interface defines the expected behavior of any authentication implementation.
 * Keep this interface stable to avoid breaking consumers like `AuthProvider` and `useAuth`.
 */
export interface AuthAdapter {
  user: User | null;
  isAuthenticated: boolean;
  signIn: (credentials: Record<string, unknown>) => Promise<void>;
  signOut: () => Promise<void>;
  restoreSession: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
}
