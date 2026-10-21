import type { StorybookConfig } from '@storybook/react-vite';
import { mergeConfig } from 'vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.tsx'],
  addons: ['@storybook/addon-a11y', '@storybook/addon-vitest'],
  framework: {
    name: '@storybook/react-vite',
    // Storybook-specific Vite config: see the comment in that file.
    options: { builder: { viteConfigPath: '.storybook/vite.config.ts' } },
  },
  core: { disableTelemetry: true },
  // The preview bundle (Storybook runtime + axe) is large by design; the
  // app's own bundle budget is enforced separately (pnpm size).
  viteFinal: (viteConfig) =>
    mergeConfig(viteConfig, { build: { chunkSizeWarningLimit: 2500 } }),
};

export default config;
