import viteReact from '@vitejs/plugin-react';
import { msw } from 'msw/vite';
import {
  defineConfig,
  loadEnv,
  type ConfigEnv,
  type PluginOption,
  type UserConfig,
} from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

import { moduleReport } from './scripts/build/module-report.mjs';
import { loadAppConfig } from './src/config/schema';

/**
 * Public base path for built assets.
 * - `BASE_PATH=/sub/` sets it explicitly (must start and end with "/").
 * - `GITHUB_PAGES=true` derives `/<repo>/` from GITHUB_PAGES_REPO or GITHUB_REPOSITORY.
 * - Otherwise the app is served from the domain root.
 * Routing uses hash URLs, so only asset URLs depend on the base.
 */
export const resolveBase = (env: NodeJS.ProcessEnv): string => {
  const explicit = env.BASE_PATH;
  if (explicit) {
    if (!/^\/(?:[\w.-]+\/)*$/.test(explicit)) {
      throw new Error(
        `BASE_PATH must start and end with "/" (received "${explicit}").`,
      );
    }
    return explicit;
  }
  if (env.GITHUB_PAGES === 'true') {
    const repo =
      env.GITHUB_PAGES_REPO ?? env.GITHUB_REPOSITORY?.split('/')[1] ?? '';
    if (!repo) {
      throw new Error(
        'GITHUB_PAGES=true requires GITHUB_PAGES_REPO or GITHUB_REPOSITORY.',
      );
    }
    return `/${repo}/`;
  }
  return '/';
};

export const createViteConfig = ({
  command,
  mode,
  isPreview,
}: ConfigEnv): UserConfig => {
  // Validate VITE_* configuration for the dev server, tests and builds with
  // the same schema the app uses at runtime. Invalid combinations (e.g. demo
  // auth in a real production build) fail here with a readable message.
  // `vite preview` only serves an already-validated build.
  const appConfig = isPreview
    ? null
    : loadAppConfig(loadEnv(mode, process.cwd(), 'VITE_'), {
        isProductionBuild: command === 'build',
      });

  const plugins: PluginOption[] = [
    viteReact(),
    tsconfigPaths(),
    moduleReport(),
  ];
  if (appConfig?.mocksEnabled) {
    // Serves mockServiceWorker.js in dev and emits it into mock-enabled builds
    // only (under the configured base path). Real builds never contain it.
    plugins.push(msw({ mode: 'worker-only' }));
  }

  return {
    base: resolveBase(process.env),
    plugins,
    build: {
      outDir: 'dist',
      // Size is gated by gzip budgets in `pnpm check:build`, not by Rollup's
      // minified-size warning.
      chunkSizeWarningLimit: 700,
      rollupOptions: {
        onwarn(warning, warn) {
          // zod ships comments Rollup cannot place; harmless and not ours.
          if (
            warning.code === 'INVALID_ANNOTATION' &&
            warning.id?.includes('/node_modules/') &&
            warning.id.includes('/zod/')
          ) {
            return;
          }
          warn(warning);
        },
      },
    },
  };
};

// https://vite.dev/config/
export default defineConfig(createViteConfig);
