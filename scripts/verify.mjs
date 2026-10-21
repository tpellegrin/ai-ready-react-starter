#!/usr/bin/env node
// @ts-check
/**
 * Everything CI runs, in one local command (`pnpm verify`). Stops at the
 * first failure and prints a timing summary. Needs Playwright Chromium
 * (`pnpm exec playwright install chromium`) for Storybook and e2e tests.
 *
 * The production build gets a placeholder VITE_API_BASE_URL when none is
 * set: verification checks that a real build works, not where it deploys.
 */
import { spawnSync } from 'node:child_process';

/** @type {Array<[string, string[], Record<string, string>?]>} */
const steps = [
  ['validate', ['validate']],
  ['coverage', ['test:cov']],
  [
    'production build',
    ['build'],
    {
      VITE_API_BASE_URL:
        process.env.VITE_API_BASE_URL ?? 'https://api.example.test',
    },
  ],
  ['build inspection', ['check:build']],
  // starter:demo-start
  ['demo build', ['build:demo']],
  ['demo build inspection', ['check:build:demo']],
  // starter:demo-end
  ['storybook tests', ['test:storybook']],
  ['storybook build', ['storybook:build']],
  ['end-to-end tests', ['test:e2e']],
  ['generator check', ['gen:check']],
  ['adoption check', ['adopt:check']],
];

const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
/** @type {Array<[string, number]>} */
const timings = [];
for (const [label, args, env] of steps) {
  console.log(`\n[verify] ▶ ${label}: pnpm ${args.join(' ')}`);
  const started = Date.now();
  const result = spawnSync(pnpm, args, {
    stdio: 'inherit',
    env: { ...process.env, ...env },
  });
  timings.push([label, (Date.now() - started) / 1000]);
  if (result.status !== 0) {
    console.error(`\n[verify] ✗ ${label} failed.`);
    process.exit(result.status ?? 1);
  }
}
console.log('\n[verify] All checks passed:');
for (const [label, seconds] of timings) {
  console.log(`  ✓ ${label.padEnd(24)} ${seconds.toFixed(1)}s`);
}
