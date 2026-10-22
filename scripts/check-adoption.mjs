#!/usr/bin/env node
// @ts-check
/**
 * Verifies `pnpm adopt` in temporary copies of the project
 * (`pnpm adopt:check`; the checkout itself is never modified). Each copy is a
 * fresh one-commit git repository, like a clone of the starter. For each
 * scenario — demo removed, reference feature removed, both — it checks that:
 *
 * - --dry-run writes nothing, and the real run leaves no markers or paths of
 *   the removed groups behind and records the starter revision;
 * - the adopted project passes everything an adopted project's own
 *   `pnpm verify` runs: validate (format, lint + boundaries, styles, types,
 *   i18n, docs, architecture fixtures, unit tests), coverage floors,
 *   production build + inspection, Storybook tests and build, end-to-end
 *   tests and the generator check. The nested verify skips its own adoption
 *   check (and the dependency audit), so verification never recurses.
 *
 *   node scripts/check-adoption.mjs [--scenario demo|reference|all] [--keep]
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { createReport, createWorkspace } from './lib/workspace.mjs';

if (process.env.STARTER_NESTED_VERIFY === '1') {
  console.error(
    '[adopt:check] Refusing to run inside a nested verification (verify → adopt:check → verify would recurse).',
  );
  process.exit(2);
}

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
  const workspace = createWorkspace(projectRoot, `starter-adopt-${name}-`, {
    git: true,
  });
  console.log(
    `\n[adopt:check] Scenario "${name}" (${flags.join(' ')}) in ${workspace.dir}`,
  );

  try {
    const head = workspace.run('git', ['rev-parse', 'HEAD'], { quiet: true });
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

    const adoption =
      /** @type {{ adoption?: { removed?: unknown, starterRevision?: unknown } }} */ (
        readJson(path.join(workspace.dir, 'starter.manifest.json'))
      ).adoption;
    report.step(
      `${name}: manifest records the removed groups and the starter revision`,
      JSON.stringify(adoption?.removed) === JSON.stringify(groups) &&
        JSON.stringify(adoption?.starterRevision) ===
          JSON.stringify({
            commit: head.output.trim(),
            uncommittedChanges: false,
          }),
      JSON.stringify(adoption),
    );

    // What an adopted project's own `pnpm verify` runs, minus the adoption
    // check itself (STARTER_NESTED_VERIFY) — never verify → adopt:check →
    // verify.
    console.log(`[adopt:check] ${name}: running the adopted project's verify…`);
    const verified = workspace.run('node', ['scripts/verify.mjs'], {
      quiet: true,
      env: { STARTER_NESTED_VERIFY: '1' },
    });
    const summary = verified.output.slice(
      verified.output.lastIndexOf('[verify]'),
    );
    report.step(
      `${name}: adopted project passes verify (${summary.split('\n')[0]?.replace('[verify] ', '') ?? ''})`,
      verified.status === 0,
      verified.output.slice(-6000),
    );
  } finally {
    if (values.keep) console.log(`[adopt:check] Kept ${workspace.dir}`);
    else workspace.cleanup();
  }
}
report.finish();
