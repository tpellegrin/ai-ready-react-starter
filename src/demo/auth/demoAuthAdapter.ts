// DEMO: removed by `pnpm adopt --remove-demo`. See docs/adoption.md.
import { z } from 'zod';

import { AuthError, userSchema, type AuthAdapter, type User } from 'auth/types';

const SESSION_KEY = 'starter.demo.session';
const ONBOARDED_KEY = 'starter.demo.onboarded';

export type DemoAuthOptions = {
  /** Simulated network latency for sign-in (ms). */
  latencyMs?: number | undefined;
  storage?: Storage | undefined;
};

const wait = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

/**
 * Demo-only adapter: signs in ANY email (password "fail" simulates invalid
 * credentials) and remembers the session in localStorage so refreshes keep
 * you signed in.
 *
 * This is deliberately NOT a credential design to copy: real adapters keep
 * credentials in server-managed HttpOnly cookies or an auth SDK (see
 * src/auth/adapters/session.ts). The composition root only loads this file in
 * demo builds (VITE_DEMO_MODE=true).
 */
export const createDemoAuthAdapter = ({
  latencyMs = 400,
  storage = window.localStorage,
}: DemoAuthOptions = {}): AuthAdapter => {
  // Storage is untrusted input: parse it, and treat failures as "no session".
  const readJson = (key: string): unknown => {
    try {
      const raw = storage.getItem(key);
      return raw === null ? null : (JSON.parse(raw) as unknown);
    } catch {
      return null;
    }
  };
  const writeJson = (key: string, value: unknown) => {
    try {
      if (value === null) storage.removeItem(key);
      else storage.setItem(key, JSON.stringify(value));
    } catch {
      // Demo persistence is best-effort (storage may be blocked).
    }
  };

  const readUser = (): User | null => {
    const parsed = userSchema.safeParse(readJson(SESSION_KEY));
    return parsed.success ? parsed.data : null;
  };
  const readOnboarded = (): string[] => {
    const parsed = z.array(z.string()).safeParse(readJson(ONBOARDED_KEY));
    return parsed.success ? parsed.data : [];
  };

  return {
    async restoreSession() {
      await wait(0);
      return readUser();
    },

    async signIn({ email, password }) {
      await wait(latencyMs);
      if (password === 'fail') throw new AuthError('invalid_credentials');
      const normalized = email.trim().toLowerCase();
      const user: User = {
        id: `demo:${normalized}`,
        email: normalized,
        name: 'Demo User',
        needsOnboarding: !readOnboarded().includes(normalized),
      };
      writeJson(SESSION_KEY, user);
      return user;
    },

    async signOut() {
      await wait(0);
      writeJson(SESSION_KEY, null);
    },

    async completeOnboarding() {
      await wait(0);
      const user = readUser();
      if (!user) throw new AuthError('unauthenticated');
      const next: User = { ...user, needsOnboarding: false };
      writeJson(SESSION_KEY, next);
      writeJson(ONBOARDED_KEY, [...new Set([...readOnboarded(), user.email])]);
      return next;
    },
  };
};
