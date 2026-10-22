// @ts-check
/**
 * The steps of `pnpm verify` (scripts/verify.mjs), in order. CI runs the same
 * commands as jobs (.github/workflows/ci.yml); keep them in sync.
 *
 * `nested: false` steps are skipped when the adoption check runs verify
 * inside an adopted copy (see scripts/check-adoption.mjs).
 */
/**
 * @typedef {{
 *   id: string,
 *   label: string,
 *   args: string[],
 *   env?: Record<string, string>,
 *   nested?: false,
 * }} Step
 */
/** @type {Step[]} */
export const steps = [
  { id: 'validate', label: 'validate', args: ['validate'] },
  {
    id: 'audit',
    label: 'production dependency audit',
    args: ['audit', '--prod', '--audit-level=high'],
    nested: false,
  },
  { id: 'coverage', label: 'coverage', args: ['test:cov'] },
  {
    id: 'build',
    label: 'production build',
    args: ['build'],
    env: {
      VITE_API_BASE_URL:
        process.env.VITE_API_BASE_URL ?? 'https://api.example.test',
    },
  },
  { id: 'check-build', label: 'build inspection', args: ['check:build'] },
  // starter:demo-start
  { id: 'build-demo', label: 'demo build', args: ['build:demo'] },
  {
    id: 'check-build-demo',
    label: 'demo build inspection',
    args: ['check:build:demo'],
  },
  // starter:demo-end
  { id: 'storybook', label: 'storybook tests', args: ['test:storybook'] },
  {
    id: 'storybook-build',
    label: 'storybook build',
    args: ['storybook:build'],
  },
  { id: 'e2e', label: 'end-to-end tests', args: ['test:e2e'] },
  { id: 'generator', label: 'generator check', args: ['gen:check'] },
  {
    id: 'adoption',
    label: 'adoption check',
    args: ['adopt:check'],
    nested: false,
  },
];
