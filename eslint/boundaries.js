// @ts-check
/**
 * Import/dependency rules for src/ (see docs/architecture/boundaries.md).
 *
 * Every folder under src/ is classified as an element type below; the
 * `boundaries/dependencies` policies then say which types may import which.
 * Aliases (`components/...`), relative paths, re-exports and dynamic
 * `import()` are all resolved to real files before checking, so none of them
 * bypass the rules. The positive/negative fixtures in
 * scripts/architecture/fixtures exercise this exact configuration
 * (`pnpm arch:check`).
 */
import boundaries from 'eslint-plugin-boundaries';

const DOCS = 'See docs/architecture/boundaries.md.';

/** Hooks with no app/navigation context: shared UI may use these. */
const NEUTRAL_HOOKS = '{useFlipLayout,useMediaQuery}';

/** First match wins at each folder level, so specific folders come first. */
const elements = [
  { type: 'config', pattern: 'src/config' },
  { type: 'utils', pattern: 'src/utils' },
  { type: 'styles', pattern: 'src/styles' },
  { type: 'assets', pattern: 'src/assets' },
  { type: 'i18n', pattern: 'src/i18n' },
  { type: 'ui', pattern: 'src/components' },
  { type: 'hooks', pattern: 'src/hooks/*', capture: ['hook'] },
  { type: 'data', pattern: 'src/api' },
  { type: 'auth', pattern: 'src/auth' },
  { type: 'forms', pattern: 'src/forms' },
  { type: 'navigation', pattern: ['src/globals', 'src/flows', 'src/guards'] },
  { type: 'feature', pattern: 'src/features/*', capture: ['feature'] },
  {
    type: 'shell',
    pattern: ['src/containers/Layouts', 'src/containers/RouteTransitions'],
  },
  { type: 'view', pattern: 'src/views' },
  { type: 'demo', pattern: 'src/demo' },
  { type: 'mocks', pattern: 'src/mocks' },
  { type: 'test-utils', pattern: 'src/test' },
  { type: 'app', pattern: 'src/containers' },
].map((element) => ({ ...element, partialMatch: false }));

const files = [
  // Base category for every file in a classified folder, so file selectors
  // can match "non-test" files. Unclassified folders stay unknown on purpose
  // (boundaries/no-unknown-files).
  {
    category: 'source',
    pattern: elements.flatMap((element) =>
      [element.pattern].flat().map((p) => `${p.replace(/\/\*$/, '')}/**`),
    ),
  },
  {
    category: 'test',
    pattern: ['src/**/*.test.{ts,tsx}', 'src/**/__tests__/**'],
  },
  { category: 'story', pattern: 'src/**/*.stories.tsx' },
  { category: 'mock', pattern: ['src/mocks/**', 'src/features/*/mocks/**'] },
];

/** @param {string[]} types */
const toTypes = (...types) => ({ to: { element: { type: types } } });

const INFRA = ['utils', 'config', 'i18n', 'styles', 'assets'];
const PLATFORM = [
  ...INFRA,
  'ui',
  'hooks',
  'data',
  'auth',
  'forms',
  'navigation',
];
const NOT_TEST = { categories: { noneOf: ['test', 'story'] } };

const policies = [
  // Third-party and Node built-in modules: allowed unless restricted below.
  { allow: { to: { module: { origin: ['external', 'core'] } } } },

  // --- Layer matrix: who may import whom -------------------------------
  // Elements of the same type may import each other (e.g. flows → globals,
  // Layouts → RouteTransitions); features are the exception (see below).
  {
    from: { element: { type: '!feature' } },
    allow: { to: { element: { type: '{{ from.element.types.[0] }}' } } },
  },
  { from: { element: { type: 'config' } }, allow: toTypes('utils') },
  { from: { element: { type: 'styles' } }, allow: toTypes('utils', 'assets') },
  {
    from: { element: { type: 'styles' } },
    allow: {
      to: { element: { type: 'hooks', captured: { hook: NEUTRAL_HOOKS } } },
    },
  },
  { from: { element: { type: 'i18n' } }, allow: toTypes('utils', 'config') },
  { from: { element: { type: 'ui' } }, allow: toTypes(...INFRA) },
  {
    from: { element: { type: 'ui' } },
    allow: {
      to: { element: { type: 'hooks', captured: { hook: NEUTRAL_HOOKS } } },
    },
  },
  {
    from: { element: { type: 'hooks' } },
    allow: toTypes(...INFRA, 'hooks', 'navigation'),
  },
  {
    from: { element: { type: 'data' } },
    allow: toTypes('utils', 'config', 'i18n'),
  },
  {
    from: { element: { type: 'auth' } },
    allow: toTypes('utils', 'config', 'i18n', 'data'),
  },
  {
    from: { element: { type: 'forms' } },
    allow: toTypes('utils', 'config', 'i18n', 'data'),
  },
  {
    from: { element: { type: 'navigation' } },
    allow: toTypes('utils', 'config', 'i18n', 'auth'),
  },
  { from: { element: { type: 'feature' } }, allow: toTypes(...PLATFORM) },
  {
    from: { element: { type: 'shell' } },
    allow: toTypes(...INFRA, 'ui', 'hooks', 'navigation'),
  },
  {
    from: { element: { type: 'view' } },
    allow: toTypes(...PLATFORM, 'shell', 'feature'),
  },
  {
    from: { element: { type: 'demo' } },
    allow: toTypes(...PLATFORM, 'shell', 'feature', 'view'),
  },
  {
    from: { element: { type: 'app' } },
    allow: toTypes(...PLATFORM, 'shell', 'feature', 'view', 'demo'),
  },
  {
    from: { element: { type: 'mocks' } },
    allow: toTypes('utils', 'config', 'data', 'auth', 'feature'),
  },
  {
    from: { element: { type: 'test-utils' } },
    allow: toTypes(
      ...PLATFORM,
      'shell',
      'feature',
      'view',
      'demo',
      'app',
      'mocks',
    ),
  },

  // --- Feature isolation and public API --------------------------------
  // Outside a feature, only its public entry (index.ts) may be imported, and
  // features never import each other: compose them in a view instead.
  {
    disallow: { to: { element: { type: 'feature' } } },
    message:
      '"{{to.element.fileInternalPath}}" is internal to feature "{{to.element.captured.feature}}". Import its public API (features/{{to.element.captured.feature}}) — and never from another feature; compose features in a view. ' +
      DOCS,
  },
  {
    from: { element: { type: ['view', 'demo', 'app', 'test-utils', 'mocks'] } },
    allow: {
      to: { element: { type: 'feature', fileInternalPath: 'index.ts' } },
    },
  },
  // A feature's mock entry (handlers/fixtures) is for mocks and tests only.
  {
    from: { element: { type: ['mocks', 'test-utils'] } },
    allow: {
      to: { element: { type: 'feature', fileInternalPath: 'mocks/index.ts' } },
    },
  },

  // Files may always import files of their own element.
  { allow: { dependency: { relationship: { to: 'internal' } } } },

  // ...except a feature's own public barrel (import modules directly).
  {
    from: { element: { type: 'feature' } },
    disallow: {
      to: { element: { type: 'feature', fileInternalPath: 'index.ts' } },
      dependency: { relationship: { to: 'internal' } },
    },
    message:
      'Inside feature "{{from.element.captured.feature}}", import modules directly instead of through its public index.ts (avoids cycles). ' +
      DOCS,
  },

  // --- Restrictions that override the matrix ---------------------------
  // Shared layers never depend on product features (any file, public or not).
  {
    from: {
      element: {
        type: [
          'config',
          'utils',
          'styles',
          'i18n',
          'ui',
          'hooks',
          'data',
          'auth',
          'forms',
          'navigation',
          'shell',
        ],
      },
    },
    disallow: { to: { element: { type: 'feature' } } },
    message:
      '{{from.element.types.[0]}} ({{from.element.path}}) is shared infrastructure and must not depend on product feature "{{to.element.captured.feature}}". Pass data/components in from a view instead. ' +
      DOCS,
  },
  {
    from: { element: { type: 'hooks', captured: { hook: NEUTRAL_HOOKS } } },
    disallow: toTypes('navigation', 'config', 'i18n'),
    message:
      'Neutral hook "{{from.element.captured.hook}}" (used by shared UI) must not depend on app context ({{to.element.types.[0]}}). ' +
      DOCS,
  },
  {
    from: { element: { type: 'ui' } },
    disallow: {
      to: {
        module: {
          origin: 'external',
          source: ['@tanstack/react-query', 'msw'],
        },
      },
    },
    message:
      'Shared UI primitives receive data through props; they must not fetch or cache server state ({{to.module.source}}). ' +
      DOCS,
  },

  // --- Test, story and mock code stays out of production code ----------
  {
    from: { element: { type: '!test-utils' }, file: NOT_TEST },
    disallow: [
      { to: { file: { categories: { anyOf: ['test', 'story'] } } } },
      { to: { element: { type: 'test-utils' } } },
    ],
    message:
      'Production code must not import tests, stories or test utilities ({{to.element.path}}). ' +
      DOCS,
  },
  {
    from: {
      element: { type: '!{mocks,test-utils}' },
      file: { categories: { noneOf: ['test', 'story', 'mock'] } },
    },
    disallow: [
      { to: { element: { type: 'mocks' } } },
      { to: { file: { categories: 'mock' } } },
      { to: { module: { source: ['msw', 'msw/*'] } } },
    ],
    message:
      'Mock code (MSW handlers, fixtures) is for tests, stories and the demo build only. ' +
      DOCS,
  },
  // The composition root may start the browser worker (gated by MOCKS_ENABLED).
  {
    from: { element: { type: 'app' }, file: NOT_TEST },
    allow: {
      to: { element: { type: 'mocks', fileInternalPath: 'browser.ts' } },
    },
  },
  // A feature's own mock files may use the shared mock helpers (e.g. faults).
  {
    from: { element: { type: 'feature' }, file: { categories: 'mock' } },
    allow: { to: { element: { type: 'mocks' } } },
  },
  // Tests and stories may use test utilities, mocks and feature mock entries.
  {
    from: { file: { categories: { anyOf: ['test', 'story'] } } },
    allow: [
      { to: { element: { type: ['test-utils', 'mocks'] } } },
      { to: { file: { categories: 'mock' } } },
    ],
  },
];

/** @type {import('eslint').Linter.Config} */
export const boundariesConfig = {
  files: ['src/**/*.{ts,tsx}'],
  plugins: { boundaries },
  settings: {
    'boundaries/root-path': import.meta.dirname.replace(/\/eslint$/, ''),
    'boundaries/ignore': ['src/main.tsx', 'src/**/*.d.ts'],
    'boundaries/legacy-templates': false,
    'boundaries/elements': elements,
    'boundaries/files': files,
    'import/resolver': {
      typescript: { project: './tsconfig.json', alwaysTryTypes: true },
    },
    // Let eslint-plugin-import parse TypeScript dependencies (needed to follow
    // the module graph for import/no-cycle).
    'import/parsers': { '@typescript-eslint/parser': ['.ts', '.tsx'] },
    'import/extensions': ['.ts', '.tsx', '.js', '.mjs'],
  },
  rules: {
    'boundaries/dependencies': [
      'error',
      {
        // Evaluate imports of packages and imports within an element too, so
        // the package restrictions and the feature-barrel rule apply.
        checkAllOrigins: true,
        checkInternals: true,
        default: 'disallow',
        message:
          '{{from.element.types.[0]}} ({{from.element.path}}) must not import {{to.element.types.[0]}} ({{to.element.path}}{{to.module.source}}). ' +
          DOCS,
        policies,
      },
    ],
    // Every file under src/ must belong to a known element (register new
    // top-level folders here and in tsconfig.app.json "paths").
    'boundaries/no-unknown-files': 'error',
    'boundaries/no-unknown-dependencies': 'error',
    'import/no-cycle': ['error', { ignoreExternal: true }],
  },
};
