#!/usr/bin/env node
// @ts-check
/**
 * Verifies `pnpm gen` end to end in a temporary copy of the project
 * (`pnpm gen:check`; the checkout itself is never modified):
 *
 * 1. --dry-run writes nothing; unsafe names and existing features are refused.
 * 2. A generated feature passes the same gates as hand-written code:
 *    typecheck, lint (type-aware + boundaries), stylelint, Prettier, i18n
 *    checks and its own tests.
 *
 * Pass --keep to leave the copy on disk for inspection.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createReport, createWorkspace } from './lib/workspace.mjs';

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
const keep = process.argv.includes('--keep');
const NAME = 'sample-items';
const workspace = createWorkspace(projectRoot, 'starter-gen-check-');
const report = createReport('gen:check');
console.log(`[gen:check] Workspace: ${workspace.dir}\n`);

const gen = (/** @type {string[]} */ args, quiet = true) =>
  workspace.run('node', ['scripts/gen.mjs', ...args], { quiet });

try {
  const before = workspace.snapshot();
  const dryRun = gen(['feature', NAME, '--dry-run']);
  report.step(
    'dry run exits 0 and writes nothing',
    dryRun.status === 0 && workspace.snapshot() === before,
    dryRun.output,
  );

  /** @type {Array<[string[], string]>} */
  const refusals = [
    [['feature', 'resources'], 'existing feature'],
    [['feature', '../outside'], 'path traversal'],
    [['feature', 'src/features/x'], 'nested path'],
    [['feature', 'Bad_Name'], 'invalid name'],
    [['feature', 'mocks'], 'reserved name'],
    [['feature', NAME, '--entity', 'lowercase'], 'invalid entity'],
    [['widget', NAME], 'unknown generator'],
  ];
  for (const [args, why] of refusals) {
    const result = gen(args);
    report.step(
      `refuses ${why} (${args.join(' ')})`,
      result.status !== 0 && workspace.snapshot() === before,
      result.output,
    );
  }

  const generated = gen(['feature', NAME], false);
  report.step(`generates feature "${NAME}"`, generated.status === 0);

  const again = gen(['feature', NAME]);
  report.step('refuses to overwrite the generated feature', again.status !== 0);

  const featureDir = `src/features/${NAME}`;
  /** @type {Array<[string, string, string[]]>} */
  const gates = [
    ['typecheck', 'tsc', ['-b']],
    [
      'lint',
      'eslint',
      [featureDir, 'src/mocks/handlers.ts', '--max-warnings=0'],
    ],
    [
      'stylelint',
      'stylelint',
      [`${featureDir}/**/*.{ts,tsx}`, '--max-warnings=0'],
    ],
    [
      'format',
      'prettier',
      ['--check', featureDir, 'src/i18n/locales', 'src/mocks/handlers.ts'],
    ],
    ['i18n keys', 'node', ['scripts/i18n-check.mjs']],
    ['pseudo-locale', 'node', ['scripts/i18n-pseudo.mjs', '--check']],
    ['feature tests', 'vitest', ['run', '--project', 'unit', featureDir]],
  ];
  for (const [label, command, args] of gates) {
    const result = workspace.run(command, args, { quiet: true });
    report.step(
      `generated code passes ${label}`,
      result.status === 0,
      result.output,
    );
  }
} finally {
  if (keep) console.log(`\n[gen:check] Kept ${workspace.dir}`);
  else workspace.cleanup();
}
report.finish();
