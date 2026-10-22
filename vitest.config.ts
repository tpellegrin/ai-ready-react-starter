import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';
import { msw } from 'msw/vite';
import { defineConfig, mergeConfig } from 'vitest/config';

import { createViteConfig } from './vite.config';

/**
 * Test projects (run one with `vitest --project <name>`):
 * - unit: jsdom component/integration tests in src/ (`pnpm test:run`).
 * - storybook: every story rendered in real Chromium, with its play function
 *   and an axe check that fails on violations (`pnpm test:storybook`).
 * - tooling: Node tests for the repository's own checks and generators
 *   (`*.test.mjs` files under scripts/, `pnpm test:tooling`).
 */
export default defineConfig((env) =>
  mergeConfig(createViteConfig(env), {
    test: {
      projects: [
        {
          test: {
            name: 'tooling',
            environment: 'node',
            include: ['scripts/**/*.test.mjs'],
          },
        },
        {
          extends: true,
          test: {
            name: 'unit',
            environment: './src/test/vitest-environment.ts',
            globals: true,
            setupFiles: ['./src/test/setup.ts'],
            include: ['src/**/*.test.{ts,tsx}'],
          },
        },
        {
          extends: true,
          plugins: [
            storybookTest({ configDir: '.storybook' }),
            // Serves mockServiceWorker.js for stories that fetch.
            msw({ mode: 'worker-only' }),
          ],
          // Pre-bundle every runtime dependency stories load. Otherwise Vite
          // discovers them mid-run on a cold cache (CI), re-optimizes, and the
          // page ends up with two React copies.
          optimizeDeps: {
            include: [
              '@hookform/resolvers/zod',
              '@radix-ui/react-alert-dialog',
              '@radix-ui/react-dialog',
              '@radix-ui/react-toast',
              '@tanstack/react-query',
              'msw/browser',
              'react-dom/client',
              'react-hook-form',
              'react-router-dom',
              'react/jsx-dev-runtime',
              'styled-components',
              'zod',
            ],
          },
          test: {
            name: 'storybook',
            browser: {
              enabled: true,
              headless: true,
              provider: playwright({}),
              instances: [{ browser: 'chromium' }],
            },
          },
        },
      ],
      coverage: {
        provider: 'v8',
        include: ['src/**/*.{ts,tsx}'],
        exclude: [
          'src/**/*.test.{ts,tsx}',
          'src/**/__tests__/**',
          'src/**/*.stories.tsx',
          'src/test/**',
          'src/**/*.d.ts',
        ],
        reporter: ['text-summary', 'html', 'lcov'],
        // Floors set just below the measured coverage (see
        // docs/starter-upgrade-plan.md). Raise them when coverage improves;
        // never lower them to make a change pass. Core infrastructure has its
        // own, stricter floors on top of the global (all files) floor.
        thresholds: {
          statements: 77,
          branches: 63,
          functions: 84,
          lines: 79,
          'src/api/**': {
            statements: 96,
            branches: 90,
            functions: 92,
            lines: 97,
          },
          'src/auth/**': {
            statements: 94,
            branches: 67,
            functions: 98,
            lines: 95,
          },
          'src/config/**': {
            statements: 96,
            branches: 94,
            functions: 98,
            lines: 98,
          },
          'src/forms/**': {
            statements: 98,
            branches: 88,
            functions: 98,
            lines: 98,
          },
          'src/{containers/routing,guards,globals/navigation}/**': {
            statements: 98,
            branches: 90,
            functions: 98,
            lines: 98,
          },
          // starter:reference-start
          'src/features/resources/**': {
            statements: 92,
            branches: 83,
            functions: 95,
            lines: 94,
          },
          // starter:reference-end
        },
      },
    },
  }),
);
