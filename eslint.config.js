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
import { starterPlugin } from './eslint/plugin.js';

const UI_DOCS = 'See docs/ui/foundation.md#public-components-and-internals.';
const RAW_COLOR =
  'Raw color value: use a theme token (theme.colors.*); colors are defined in src/styles/themes.';

/** Configuration access (src/config is the only reader of import.meta.env). */
const ENV_SYNTAX = [
  {
    selector:
      "MemberExpression[object.type='MetaProperty'][property.name='env']",
    message:
      'Read configuration through `config` (src/config); import.meta.env is only read there.',
  },
  {
    selector: "MemberExpression[object.name='process'][property.name='env']",
    message:
      'process.env does not exist in the browser. Use `config` (src/config).',
  },
];

/** Composition and styling conventions that have a precise syntax. */
const STYLE_SYNTAX = [
  {
    selector:
      'ImportDeclaration[source.value=/styles$/] > ImportNamespaceSpecifier',
    message: `Import styled elements by name (import { _ButtonRoot } from './styles'), not as a namespace, so each use is greppable. ${UI_DOCS}`,
  },
  {
    selector: 'ExportAllDeclaration[source.value=/^[.]/]',
    message: `Export a module's public names explicitly (export { Button } from './Button'; export type { ButtonProps } …) instead of \`export *\`, so the public API is reviewable and internals never leak. ${UI_DOCS}`,
  },
  {
    selector: "JSXAttribute[name.name='style'] Property[key.name='transition']",
    message:
      'Inline transitions bypass the motion system (global clamp, reduced motion). Opt in with data-allow-* and --transition-* variables (docs/animation-system.md).',
  },
];

/** Raw colors in code (styled templates are checked by Stylelint). */
const COLOR_SYNTAX = [
  {
    selector:
      'Literal[value=/^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/]',
    message: RAW_COLOR,
  },
  { selector: 'Literal[value=/^(?:rgb|hsl)a?\\(/]', message: RAW_COLOR },
];

/**
 * Styling systems (ADR 0005). Component internals are enforced by
 * starter/no-internal-styled-imports (`_` elements only from './styles' in
 * their own folder) and, for shared UI and layouts, by eslint/boundaries.js
 * (only each component's index, through aliases, relative paths, re-exports
 * and import()).
 */
const RESTRICTED_IMPORT_PATTERNS = [
  {
    regex: '^(?!modern-normalize/).*\\.(?:css|scss|sass|less|styl)$',
    message:
      'Styles are styled-components with theme tokens (ADR 0005), not stylesheet imports. The global reset is the only CSS import (main.tsx).',
  },
  {
    group: [
      '@emotion/*',
      'tailwindcss',
      'tailwindcss/*',
      'styled-jsx',
      'styled-jsx/*',
      '@vanilla-extract/*',
      '@stitches/*',
      '@linaria/*',
    ],
    message:
      'A parallel styling system is not used here: style with styled-components and theme tokens (ADR 0005); propose an ADR first if that no longer fits.',
  },
];

const NETWORK_MESSAGE =
  'Requests go through apiClient (src/api) with a response schema and the query signal, inside a feature query or mutation (docs/recipes/data-and-forms.md).';
const STORAGE_MESSAGE =
  'Browser storage is limited to allow-listed modules (auth adapters, the language preference, mocks). Session credentials stay in HttpOnly cookies or the auth SDK (SECURITY.md); for other state use the URL, React state or the server.';

/** Raw network and storage APIs, allowed only in the modules listed below. */
const NETWORK_GLOBALS = ['fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource'];
const STORAGE_GLOBALS = ['localStorage', 'sessionStorage', 'indexedDB'];
const restrictedGlobals = (/** @type {string[]} */ names, message) =>
  names.map((name) => ({ name, message }));
const restrictedProperties = (/** @type {string[]} */ names, message) =>
  ['window', 'globalThis', 'self'].flatMap((object) =>
    names.map((property) => ({ object, property, message })),
  );
const NETWORK_RULES = {
  globals: restrictedGlobals(NETWORK_GLOBALS, NETWORK_MESSAGE),
  properties: [
    ...restrictedProperties(NETWORK_GLOBALS, NETWORK_MESSAGE),
    { object: 'navigator', property: 'sendBeacon', message: NETWORK_MESSAGE },
  ],
};
const STORAGE_RULES = {
  globals: restrictedGlobals(STORAGE_GLOBALS, STORAGE_MESSAGE),
  properties: [
    ...restrictedProperties(STORAGE_GLOBALS, STORAGE_MESSAGE),
    { object: 'document', property: 'cookie', message: STORAGE_MESSAGE },
  ],
};
/** @param {Array<{ globals: object[], properties: object[] }>} groups */
const restrictedApis = (...groups) => ({
  'no-restricted-globals': ['error', ...groups.flatMap((g) => g.globals)],
  'no-restricted-properties': ['error', ...groups.flatMap((g) => g.properties)],
});

/** styled-components factories belong in styles.ts files and src/styles. */
const STYLED_OUTSIDE_STYLES = [
  {
    name: 'styled-components',
    importNames: ['styled', 'default', 'css', 'keyframes', 'createGlobalStyle'],
    message: `Define styled elements in the component's styles.ts (named _<Component><Part>) and import them by name; theme-wide styles live in src/styles. ${UI_DOCS}`,
  },
];

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
        ...ENV_SYNTAX,
        ...STYLE_SYNTAX,
        ...COLOR_SYNTAX,
      ],
      'no-restricted-imports': [
        'error',
        {
          patterns: RESTRICTED_IMPORT_PATTERNS,
          paths: STYLED_OUTSIDE_STYLES,
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

  // Raw network and storage APIs (docs/guardrails.md). Production code reaches
  // the network through src/api/http and storage through the modules below.
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: restrictedApis(NETWORK_RULES, STORAGE_RULES),
  },
  {
    // The HTTP client is the only fetch caller.
    files: ['src/api/http/**/*.ts'],
    rules: restrictedApis(STORAGE_RULES),
  },
  {
    // Auth adapters own credential storage; the i18n provider persists the
    // language preference.
    files: [
      'src/auth/adapters/**/*.ts',
      'src/demo/auth/**/*.ts',
      'src/i18n/provider.tsx',
    ],
    rules: restrictedApis(NETWORK_RULES),
  },
  {
    // Mocks, tests, stories and test utilities emulate the backend.
    files: [
      'src/mocks/**',
      'src/features/*/mocks/**',
      'src/test/**',
      'src/**/*.test.{ts,tsx}',
      'src/**/__tests__/**',
      'src/**/*.stories.tsx',
    ],
    rules: {
      'no-restricted-globals': 'off',
      'no-restricted-properties': 'off',
    },
  },

  // Project rules (eslint/plugin.js).
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { starter: starterPlugin },
    rules: {
      'starter/styled-element-names': 'error',
      'starter/no-internal-styled-imports': 'error',
      'starter/no-protected-suppression': 'error',
    },
  },

  // Styles files and src/styles create styled elements and css fragments.
  {
    files: ['src/**/styles.{ts,tsx}', 'src/styles/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: RESTRICTED_IMPORT_PATTERNS },
      ],
    },
  },

  // The configuration module is the one place that reads import.meta.env.
  {
    files: ['src/config/**/*.ts'],
    rules: {
      'no-restricted-syntax': ['error', ...STYLE_SYNTAX, ...COLOR_SYNTAX],
    },
  },

  // Theme definitions are where raw color values live.
  {
    files: ['src/styles/themes/**/*.ts'],
    rules: {
      'no-restricted-syntax': ['error', ...ENV_SYNTAX, ...STYLE_SYNTAX],
    },
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
