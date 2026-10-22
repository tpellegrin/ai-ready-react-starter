#!/usr/bin/env node
// @ts-check
/**
 * Verifies `pnpm adopt` in temporary copies of the project
 * (`pnpm adopt:check`; the checkout itself is never modified). Each copy is a
 * fresh one-commit git repository, like a clone of the starter. Scenarios:
 * demo removed, reference feature removed, both, and `product` — both
 * removed, then a small real product built the documented way (a domain
 * feature and its page with the generators, a nav link, a new app name),
 * continued with the product's own code from scripts/adoption/product: a
 * create form and a browser journey through the generated page (loading,
 * content, empty and error states; validation, a failed save, a retry).
 * For each scenario it checks that:
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
 *   node scripts/check-adoption.mjs [--scenario demo|reference|all|product] [--keep]
 */
import {
  copyFileSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { copyConflicts, listFiles, mergeCopy } from './lib/generator.mjs';
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

/**
 * After adoption, the `product` scenario does what a team does first: real
 * domain names in product code, a page with navigation, its own branding.
 * @type {Array<[string, string, string[]]>}
 */
const PRODUCT_STEPS = [
  [
    'generate a domain feature',
    'node',
    ['scripts/gen.mjs', 'feature', 'invoices', '--entity', 'Invoice'],
  ],
  [
    'generate a feature component',
    'node',
    [
      'scripts/gen.mjs',
      'component',
      'InvoiceTotal',
      '--feature',
      'invoices',
      '--logic',
    ],
  ],
  [
    'generate its page, route and nav link',
    'node',
    [
      'scripts/gen.mjs',
      'view',
      'Invoices',
      '--group',
      'user',
      '--feature',
      'invoices',
      '--nav',
    ],
  ],
];
const PRODUCT_NAME = 'Ledgerly';
/**
 * Then the product's own code on top of what was generated, the way a team
 * continues (scripts/adoption/product): `files/` is copied over the copy —
 * a create form composed into the generated page (model, endpoint,
 * mutation, mock, component, unit tests) and a browser journey through the
 * page's navigation, list states and form — and `copy/<locale>.json` is
 * merged into each locale. These files are outside the starter's lint and
 * type projects; the adopted project's own verify checks them like any
 * product code.
 */
const PRODUCT_OVERLAY = path.join(projectRoot, 'scripts/adoption/product');
/** The generated page, kept out of the initial bundle by `check:build`. */
const PRODUCT_LAZY_MODULE = 'src/views/user/Invoices/index.tsx';

/** @type {Record<string, { flags: string[], product?: boolean }>} */
const SCENARIOS = {
  demo: { flags: ['--remove-demo'] },
  reference: { flags: ['--remove-reference'] },
  all: { flags: ['--remove-demo', '--remove-reference'] },
  product: { flags: ['--remove-demo', '--remove-reference'], product: true },
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

/**
 * Applies PRODUCT_OVERLAY to an adopted copy whose generators have run.
 * @param {ReturnType<typeof createWorkspace>} workspace
 * @param {string} name  scenario name, for the report
 */
const applyProductOverlay = (workspace, name) => {
  const files = path.join(PRODUCT_OVERLAY, 'files');
  for (const file of listFiles(files)) {
    const target = path.join(workspace.dir, path.relative(files, file));
    mkdirSync(path.dirname(target), { recursive: true });
    copyFileSync(file, target);
  }

  // Copy only adds keys, like the generators' (scripts/lib/generator.mjs).
  const locales = path.join(workspace.dir, 'src/i18n/locales');
  /** @type {string[]} */
  const conflicts = [];
  for (const file of readdirSync(locales)) {
    if (!file.endsWith('.json') || file === 'pseudo.json') continue;
    const target = path.join(locales, file);
    const locale = /** @type {Record<string, unknown>} */ (readJson(target));
    const copy = /** @type {Record<string, unknown>} */ (
      readJson(path.join(PRODUCT_OVERLAY, 'copy', file))
    );
    conflicts.push(
      ...copyConflicts(locale, copy).map((conflict) => `${file}: ${conflict}`),
    );
    mergeCopy(locale, copy);
    writeFileSync(target, `${JSON.stringify(locale, null, 2)}\n`);
  }

  // The generator's next step for a lazy page: keep it lazy for good.
  const checkBuild = path.join(workspace.dir, 'scripts/check-build.mjs');
  const source = readFileSync(checkBuild, 'utf8');
  const lazy = source.replace(
    /(const LAZY_MODULES = \{\s*production: \[)/,
    `$1'${PRODUCT_LAZY_MODULE}', `,
  );
  writeFileSync(checkBuild, lazy);

  const formatted = [
    ['node', ['scripts/i18n-pseudo.mjs']],
    ['prettier', ['--write', 'src/i18n/locales', 'scripts/check-build.mjs']],
  ].map(([command, args]) =>
    workspace.run(
      /** @type {string} */ (command),
      /** @type {string[]} */ (args),
      {
        quiet: true,
      },
    ),
  );
  report.step(
    `${name}: add the product's form, browser journey, copy and lazy page`,
    conflicts.length === 0 &&
      lazy !== source &&
      formatted.every((result) => result.status === 0),
    [
      ...conflicts,
      ...(lazy === source ? ['LAZY_MODULES.production not found'] : []),
      ...formatted.map((result) => result.output),
    ].join('\n'),
  );
};

for (const name of selected) {
  const scenario = SCENARIOS[name];
  if (!scenario) {
    report.step(`unknown scenario "${name}"`, false);
    continue;
  }
  const { flags } = scenario;
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
      const markdownMarkers = workspace.run(
        'git',
        [
          'grep',
          '--no-index',
          '-l',
          '-E',
          `^\\s*<!--\\s*starter:${group}-`,
          '--',
          '*.md',
          ':!node_modules',
        ],
        { quiet: true },
      );
      markers.output += markdownMarkers.output;
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

    if (scenario.product) {
      for (const [label, command, args] of PRODUCT_STEPS) {
        const result = workspace.run(command, args, { quiet: true });
        report.step(`${name}: ${label}`, result.status === 0, result.output);
      }
      // Branding: every environment names the product.
      for (const file of [
        '.env.development',
        '.env.production',
        '.env.test',
        '.env.storybook',
        '.env.example',
      ]) {
        const target = path.join(workspace.dir, file);
        const text = readFileSync(target, 'utf8');
        writeFileSync(
          target,
          text.replace(/^VITE_APP_NAME=.*$/m, `VITE_APP_NAME=${PRODUCT_NAME}`),
        );
      }
      applyProductOverlay(workspace, name);
      report.step(
        `${name}: product names live in product code`,
        workspace.run(
          'git',
          [
            'grep',
            '--no-index',
            '-q',
            'Invoice',
            '--',
            'src/features/invoices',
          ],
          { quiet: true },
        ).status === 0,
      );
    }

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
