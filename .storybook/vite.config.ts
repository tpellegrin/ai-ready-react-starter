import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';

import { defineConfig, mergeConfig } from 'vite';

import { createViteConfig } from '../vite.config';

const STORYBOOK_MODE = 'storybook';

/**
 * Storybook loads `.env.<NODE_ENV>` into process.env before reading this
 * file (`.env.production` during `storybook build`), and Vite lets
 * process.env win over `.env.<mode>` files. Apply .env.storybook explicitly
 * so the catalog always gets the same configuration (mock API on, demo
 * auth), whichever command built it.
 */
const storybookEnv = parseEnv(
  readFileSync(
    fileURLToPath(new URL('../.env.storybook', import.meta.url)),
    'utf8',
  ),
);
Object.assign(process.env, storybookEnv);

/**
 * Storybook reuses the app's Vite config (aliases, React plugin, config
 * validation, MSW worker) in its own mode, so building the catalog never
 * needs production deployment variables.
 */
export default defineConfig(() =>
  mergeConfig(
    createViteConfig({
      command: 'serve',
      mode: STORYBOOK_MODE,
      isPreview: false,
    }),
    { mode: STORYBOOK_MODE },
  ),
);
