#!/usr/bin/env node
// @ts-check
/**
 * Verifies `pnpm adopt` in temporary copies of the project
 * (`pnpm adopt:check`; the checkout itself is never modified). For each
 * scenario — demo removed, reference feature removed, both — it checks that:
 *
 * - --dry-run writes nothing, and the real run leaves no markers or paths of
 *   the removed groups behind;
 * - the adopted project passes typecheck, lint (including architecture
 *   boundaries), stylelint, Prettier, i18n checks, the architecture fixtures,
 *   unit tests with coverage floors (auth through the test adapter), and a
 *   production build with its artifact inspection.
 *
 *   node scripts/check-adoption.mjs [--scenario demo|reference|all] [--keep]
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { createReport, createWorkspace } from './lib/workspace.mjs';

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
const { values } = parseArgs({
  options: {
    scenario: { type: 'string', multiple: true },
    keep: { type: 'boolean', default: false },
  },
});

/** @type {Record<string, string[]>} */
const SCENARIOS = {
  demo: ['--remove-demo'],
  reference: ['--remove-reference'],
  all: ['--remove-demo', '--remove-reference'],
};
const selected = values.scenario?.length
  ? values.scenario
  : Object.keys(SCENARIOS);

/** @param {string} file @returns {unknown} */
const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'));
const manifest =
  /** @type {{ groups: Record<string, { delete: string[] }> }} */ (
    readJson(path.join(projectRoot, 'starter.manifest.json'))
  );

const report = createReport('adopt:check');

for (const name of selected) {
  const flags = SCENARIOS[name];
  if (!flags) {
    report.step(`unknown scenario "${name}"`, false);
    continue;
  }
  const groups = flags.map((flag) => flag.replace('--remove-', ''));
  const workspace = createWorkspace(projectRoot, `starter-adopt-${name}-`);
  console.log(
    `\n[adopt:check] Scenario "${name}" (${flags.join(' ')}) in ${workspace.dir}`,
  );

  try {
    const before = workspace.snapshot('.');
    const dryRun = workspace.run(
      'node',
      ['scripts/adopt.mjs', ...flags, '--dry-run'],
      { quiet: true },
    );
    report.step(
      `${name}: dry run exits 0 and writes nothing`,
      dryRun.status === 0 && workspace.snapshot('.') === before,
      dryRun.output,
    );

    const adopted = workspace.run('node', ['scripts/adopt.mjs', ...flags], {
      quiet: true,
    });
    report.step(
      `${name}: adoption succeeds`,
      adopted.status === 0,
      adopted.output,
    );

    for (const group of groups) {
      const markers = workspace.run(
        'git',
        [
          'grep',
          '--no-index',
          '-l',
          `starter:${group}-`,
          '--',
          '.',
          ':!scripts/adopt.mjs',
          ':!*.md',
          ':!node_modules',
        ],
        { quiet: true },
      );
      report.step(
        `${name}: no "${group}" markers left`,
        markers.output.trim() === '',
        markers.output,
      );
      const leftovers = (manifest.groups[group]?.delete ?? []).filter(
        (target) =>
          workspace.run('test', ['-e', target], { quiet: true }).status === 0,
      );
      report.step(
        `${name}: "${group}" files removed`,
        leftovers.length === 0,
        leftovers.join(', '),
      );
    }

    /** @type {Array<[string, string, string[], Record<string, string>?]>} */
    const gates = [
      ['typecheck', 'tsc', ['-b']],
      ['lint', 'eslint', ['.', '--max-warnings=0']],
      ['stylelint', 'stylelint', ['src/**/*.{ts,tsx}', '--max-warnings=0']],
      ['format', 'prettier', ['--check', '.']],
      ['i18n keys', 'node', ['scripts/i18n-check.mjs']],
      ['pseudo-locale', 'node', ['scripts/i18n-pseudo.mjs', '--check']],
      ['architecture fixtures', 'node', ['scripts/architecture/check.mjs']],
      [
        'unit tests + coverage floors',
        'vitest',
        ['run', '--project', 'unit', '--coverage'],
      ],
      [
        'production build',
        'vite',
        ['build', '--logLevel', 'warn'],
        { VITE_API_BASE_URL: 'https://api.example.test' },
      ],
      ['build inspection', 'node', ['scripts/check-build.mjs']],
    ];
    for (const [label, command, args, env] of gates) {
      const result = workspace.run(command, args, {
        quiet: true,
        env: env ?? {},
      });
      report.step(
        `${name}: ${label}`,
        result.status === 0,
        result.output.slice(-4000),
      );
    }
  } finally {
    if (values.keep) console.log(`[adopt:check] Kept ${workspace.dir}`);
    else workspace.cleanup();
  }
}
report.finish();
