#!/usr/bin/env node
// @ts-check
/**
 * Everything CI runs, in one local command (`pnpm verify`). Stops at the
 * first failure and prints a timing summary. Needs Playwright Chromium
 * (`pnpm exec playwright install chromium`) for the Storybook and e2e tests,
 * and network access for the dependency audit.
 *
 *   pnpm verify [--skip <id>]... [--list]
 *
 * The steps live in scripts/lib/verify-steps.mjs. The production build gets
 * a placeholder VITE_API_BASE_URL when none is set: verification checks that
 * a real build works, not where it deploys.
 *
 * Nested runs: `pnpm adopt:check` runs this script inside each adopted copy
 * with STARTER_NESTED_VERIFY=1. Steps marked `nested: false` are skipped
 * there — the adoption check itself (so verify → adopt:check → verify can
 * never recurse) and the audit (adoption does not change dependencies).
 */
import { spawnSync } from 'node:child_process';
import { parseArgs } from 'node:util';

import { steps } from './lib/verify-steps.mjs';

const { values } = parseArgs({
  options: {
    skip: { type: 'string', multiple: true, default: [] },
    list: { type: 'boolean', default: false },
  },
});
const unknown = values.skip.filter((id) => !steps.some((s) => s.id === id));
if (unknown.length) {
  console.error(
    `[verify] Unknown step(s): ${unknown.join(', ')}. Run with --list.`,
  );
  process.exit(2);
}
if (values.list) {
  for (const step of steps) {
    console.log(`  ${step.id.padEnd(18)} pnpm ${step.args.join(' ')}`);
  }
  process.exit(0);
}

const nested = process.env.STARTER_NESTED_VERIFY === '1';
const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
/** @type {Array<[string, string]>} */
const summary = [];
for (const step of steps) {
  if (values.skip.includes(step.id) || (nested && step.nested === false)) {
    summary.push([step.label, 'skipped']);
    continue;
  }
  console.log(`\n[verify] ▶ ${step.label}: pnpm ${step.args.join(' ')}`);
  const started = Date.now();
  const result = spawnSync(pnpm, step.args, {
    stdio: 'inherit',
    env: { ...process.env, ...step.env },
  });
  summary.push([step.label, `${((Date.now() - started) / 1000).toFixed(1)}s`]);
  if (result.status !== 0) {
    console.error(`\n[verify] ✗ ${step.label} failed.`);
    process.exit(result.status ?? 1);
  }
}

const skipped = summary.filter(([, result]) => result === 'skipped').length;
console.log(
  `\n[verify] All checks passed${skipped ? ` (${skipped} skipped)` : ''}:`,
);
for (const [label, result] of summary) {
  const mark = result === 'skipped' ? '-' : '✓';
  console.log(`  ${mark} ${label.padEnd(30)} ${result}`);
}
