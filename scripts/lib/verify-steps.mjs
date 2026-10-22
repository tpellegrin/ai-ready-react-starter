// @ts-check
/**
 * The checks of `pnpm verify` (scripts/verify.mjs), in order. CI runs the
 * same package scripts as jobs (.github/workflows/ci.yml); `pnpm docs:check`
 * fails when a step's script is missing there.
 *
 * - `script` is a package.json script (or a pnpm command such as `audit`);
 *   `args` are appended for machine-readable output, so the package scripts
 *   stay the single definition of each check.
 * - `group: 'validate'` steps are the fast set (`pnpm validate`).
 * - `needs` skips a step when a step it depends on failed.
 * - `nested: false` steps are skipped when the adoption check runs verify
 *   inside an adopted copy (STARTER_NESTED_VERIFY=1): the adoption check
 *   itself (never verify → adopt:check → verify) and the audit (adoption
 *   does not change dependencies).
 * - `{artifact}` in args/env is replaced by reports/verify/<artifact>.
 */

/**
 * @typedef {{
 *   id: string,
 *   label: string,
 *   script: string,
 *   args?: string[],
 *   env?: Record<string, string>,
 *   artifact?: string,
 *   parser?: string,
 *   group?: 'validate',
 *   needs?: string[],
 *   nested?: false,
 * }} Step
 */

/** @param {string} artifact */
const vitestJson = (artifact) => ({
  args: [
    '--reporter=default',
    '--reporter=json',
    '--outputFile.json={artifact}',
  ],
  artifact,
  parser: 'vitest',
});

/** @type {Step[]} */
export const steps = [
  {
    id: 'format',
    label: 'format',
    script: 'format:check',
    parser: 'prettier',
    group: 'validate',
  },
  {
    id: 'lint',
    label: 'lint (ESLint, boundaries)',
    script: 'lint',
    args: ['--format', 'json', '--output-file', '{artifact}'],
    artifact: 'lint.json',
    parser: 'eslintJson',
    group: 'validate',
  },
  {
    id: 'stylelint',
    label: 'styles (Stylelint)',
    script: 'lint:css',
    args: ['--formatter', 'json', '--output-file', '{artifact}'],
    artifact: 'stylelint.json',
    parser: 'stylelintJson',
    group: 'validate',
  },
  {
    id: 'typecheck',
    label: 'types',
    script: 'typecheck',
    args: ['--pretty', 'false'],
    parser: 'tsc',
    group: 'validate',
  },
  {
    id: 'i18n',
    label: 'translations',
    script: 'i18n:check',
    parser: 'markedLines',
    group: 'validate',
  },
  {
    id: 'docs',
    label: 'docs and command references',
    script: 'docs:check',
    parser: 'markedLines',
    group: 'validate',
  },
  {
    id: 'architecture',
    label: 'architecture fixtures',
    script: 'arch:check',
    parser: 'markedLines',
    group: 'validate',
  },
  {
    id: 'tooling',
    label: 'tooling tests',
    script: 'test:tooling',
    ...vitestJson('tooling.json'),
    group: 'validate',
  },
  {
    id: 'unit',
    label: 'unit and integration tests',
    script: 'test:run',
    ...vitestJson('unit.json'),
    group: 'validate',
  },
  {
    id: 'audit',
    label: 'production dependency audit',
    script: 'audit',
    args: ['--prod', '--audit-level=high'],
    nested: false,
  },
  {
    id: 'coverage',
    label: 'coverage floors',
    script: 'test:cov',
    ...vitestJson('coverage.json'),
  },
  {
    id: 'build',
    label: 'production build',
    script: 'build',
    env: {
      VITE_API_BASE_URL:
        process.env.VITE_API_BASE_URL ?? 'https://api.example.test',
    },
  },
  {
    id: 'check-build',
    label: 'build inspection',
    script: 'check:build',
    parser: 'markedLines',
    needs: ['build'],
  },
  // starter:demo-start
  { id: 'build-demo', label: 'demo build', script: 'build:demo' },
  {
    id: 'check-build-demo',
    label: 'demo build inspection',
    script: 'check:build:demo',
    parser: 'markedLines',
    needs: ['build-demo'],
  },
  // starter:demo-end
  {
    id: 'storybook',
    label: 'Storybook tests (Chromium, axe)',
    script: 'test:storybook',
    ...vitestJson('storybook.json'),
  },
  {
    id: 'storybook-build',
    label: 'Storybook build',
    script: 'storybook:build',
  },
  {
    id: 'e2e',
    label: 'end-to-end tests',
    script: 'test:e2e',
    args: ['--reporter=list,json'],
    env: {
      PLAYWRIGHT_JSON_OUTPUT_FILE: '{artifact}',
      PLAYWRIGHT_JSON_OUTPUT_NAME: '{artifact}',
    },
    artifact: 'e2e.json',
    parser: 'playwright',
  },
  {
    id: 'generator',
    label: 'generator check',
    script: 'gen:check',
    parser: 'markedLines',
  },
  {
    id: 'adoption',
    label: 'adoption check',
    script: 'adopt:check',
    parser: 'markedLines',
    nested: false,
  },
];
