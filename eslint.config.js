// @ts-check
import eslint from '@eslint/js';
import prettierConfig from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import';
import jsxA11yPlugin from 'eslint-plugin-jsx-a11y';
import reactPlugin from 'eslint-plugin-react';
import hooksPlugin from 'eslint-plugin-react-hooks';
import storybookPlugin from 'eslint-plugin-storybook';
import globals from 'globals';
import tseslint from 'typescript-eslint';

import { boundariesConfig } from './eslint/boundaries.js';

/**
 * Lint policy (see docs/guardrails.md):
 * - Type-aware rules everywhere TypeScript can type the file (project service).
 * - Unsafe `any` flows, floating/misused promises, explicit `any` and hook
 *   dependency mistakes are errors. `void promise` does NOT silence a floating
 *   promise: handle or return it.
 * - `pnpm lint` runs with --max-warnings=0, so there are no "soft" rules.
 */
export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'dist-*/**',
      'coverage/**',
      'storybook-static/**',
      'reports/**',
      'playwright-report/**',
      'test-results/**',
      'node_modules/**',
      'scripts/templates/**',
      // Linted at their virtual src/ paths by `pnpm arch:check`.
      'scripts/architecture/fixtures/**',
      'scripts/architecture/support/**',
    ],
  },
  {
    linterOptions: { reportUnusedDisableDirectives: 'error' },
  },
  eslint.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: { import: importPlugin },
    rules: {
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-floating-promises': [
        'error',
        {
          ignoreVoid: false,
          // Narrow exception: React Router's navigate() promise resolves when the
          // navigation settles; failures surface through route error boundaries,
          // never as rejections. Everything else must be awaited, returned or
          // handled with runDetached(promise, onError) from utils/async.
          allowForKnownSafeCalls: [
            {
              from: 'package',
              package: 'react-router',
              name: 'NavigateFunction',
            },
          ],
        },
      ],
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': [
        'error',
        { considerDefaultExhaustiveForUnions: true },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      '@typescript-eslint/no-empty-object-type': [
        'error',
        { allowInterfaces: 'with-single-extends' },
      ],
      'import/no-duplicates': 'error',
      'no-console': ['error', { allow: ['warn', 'error'] }],
      'no-debugger': 'error',
    },
  },

  // Browser application code, tests and stories.
  {
    files: ['src/**/*.{ts,tsx}', '.storybook/preview.tsx'],
    plugins: {
      react: reactPlugin,
      'react-hooks': hooksPlugin,
      'jsx-a11y': jsxA11yPlugin,
    },
    languageOptions: {
      globals: { ...globals.browser },
    },
    settings: { react: { version: 'detect' } },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactPlugin.configs['jsx-runtime'].rules,
      ...jsxA11yPlugin.configs.recommended.rules,
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
      'react/prop-types': 'off',
      'react/display-name': 'off',
      'react/no-unescaped-entities': 'off',
      'react/self-closing-comp': ['error', { component: true, html: true }],
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "MemberExpression[object.type='MetaProperty'][property.name='env']",
          message:
            'Read configuration through `config` (src/config); import.meta.env is only read there.',
        },
        {
          selector:
            "MemberExpression[object.name='process'][property.name='env']",
          message:
            'process.env does not exist in the browser. Use `config` (src/config).',
        },
      ],
      // Dev dependencies (msw, testing libraries, Storybook) only in tests,
      // stories, mocks and test utilities.
      'import/no-extraneous-dependencies': [
        'error',
        {
          devDependencies: [
            'src/**/*.test.{ts,tsx}',
            'src/**/__tests__/**',
            'src/**/*.stories.tsx',
            'src/test/**',
            'src/mocks/**',
            'src/features/*/mocks/**',
            '.storybook/**',
          ],
          includeTypes: true,
        },
      ],
    },
  },

  // Stories: CSF rules (default export, named stories, no redundant names,
  // awaited interactions in play functions).
  ...storybookPlugin.configs['flat/recommended'],

  // The configuration module is the one place that reads import.meta.env.
  {
    files: ['src/config/**/*.ts'],
    rules: { 'no-restricted-syntax': 'off' },
  },

  // Architecture: element types and the import matrix (eslint/boundaries.js).
  boundariesConfig,

  // Node tooling (configs, scripts, end-to-end tests).
  {
    files: [
      '*.config.{js,ts}',
      'eslint/**/*.js',
      'scripts/**/*.mjs',
      'e2e/**/*.ts',
      '.storybook/main.ts',
      '.storybook/vite.config.ts',
    ],
    languageOptions: { globals: { ...globals.node } },
    rules: { 'no-console': 'off' },
  },

  // The flat config imports untyped plugins; type-aware rules add no value here.
  {
    files: ['eslint.config.js', 'eslint/**/*.js'],
    extends: [tseslint.configs.disableTypeChecked],
  },

  // CommonJS config files are not part of a TypeScript project.
  {
    files: ['**/*.cjs'],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: {
      sourceType: 'commonjs',
      globals: { ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },

  prettierConfig,
);
