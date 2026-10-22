import { apiClient, csrfToken } from 'api/client';
import { createSessionAuthAdapter } from 'auth/adapters/session';
import type { AuthAdapter } from 'auth/types';
// starter:demo-start
import { ConfigError, DEMO_MODE, type AppConfig } from 'config';
// starter:demo-else
// import type { AppConfig } from 'config';
// starter:demo-end

/**
 * Composition root for authentication: the one place that decides which
 * AuthAdapter the app uses (from VITE_AUTH_PROVIDER). To add your own
 * provider, add a value to AUTH_PROVIDERS in src/config/schema.ts and a case
 * here (see docs/recipes/real-auth-adapter.md). Returns a promise so a
 * provider can load its SDK lazily.
 */
export const createAuthAdapter = (config: AppConfig): Promise<AuthAdapter> => {
  switch (config.authProvider) {
    case 'session':
      return Promise.resolve(
        createSessionAuthAdapter(apiClient, { csrf: csrfToken }),
      );
    // starter:demo-start
    // The demo adapter is behind DEMO_MODE (a build-time constant) and a
    // dynamic import, so non-demo bundles do not contain it.
    case 'demo':
      if (DEMO_MODE) {
        return import('demo/auth/demoAuthAdapter').then(
          ({ createDemoAuthAdapter }) => createDemoAuthAdapter(),
        );
      }
      // Unreachable for validated configs; kept as a hard stop.
      return Promise.reject(
        new ConfigError([
          'VITE_AUTH_PROVIDER=demo requires a build with VITE_DEMO_MODE=true.',
        ]),
      );
    // starter:demo-end
  }
};
