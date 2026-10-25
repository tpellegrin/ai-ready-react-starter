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
 * `design` proves image-guided composition after both removals: two pages
 * built from reference images (scripts/adoption/design), their plans,
 * captures, regression baselines and a deliberate regression
 * (scripts/lib/design/proof.mjs); its evidence is copied to
 * reports/adoption/design/<time>/.
 * For each scenario it checks that:
 *
 * - --dry-run writes nothing, and the real run leaves no markers or paths of
 *   the removed groups behind and records the starter revision;
 * - this check is gone from the adopted project's own setup (its
 *   `pnpm verify` steps and CI; `starter:maintenance` markers), and running
 *   it there is refused: it verifies the starter only;
 * - the adopted project passes everything an adopted project's own
 *   `pnpm verify` runs: validate (format, lint + boundaries, styles, types,
 *   i18n, docs, architecture fixtures, unit tests), coverage floors,
 *   production build + inspection, Storybook tests and build, end-to-end
 *   tests and the generator check. The nested verify skips the dependency
 *   audit (adoption does not change dependencies).
 *
 *   node scripts/check-adoption.mjs [--scenario demo|reference|all|product|design] [--keep]
 *
 * In an adopted project (starter.manifest.json › adoption set) it refuses to
 * run and exits with 2.
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

import { runDesignProof } from './lib/design/proof.mjs';
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
/** @param {string} file @returns {unknown} */
const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'));
const manifest =
  /** @type {{ groups: Record<string, { flag?: string, delete: string[] }>, adoption: unknown }} */ (
    readJson(path.join(projectRoot, 'starter.manifest.json'))
  );

// It proves that the starter can be adopted. An adopted project has its own
// adoption record and history, so the check has nothing to verify there.
if (manifest.adoption !== null) {
  console.error(
    [
      '[adopt:check] Refusing to run: adopt:check verifies the starter itself, and this project was adopted from it (starter.manifest.json › adoption is set).',
      'Your project is verified by pnpm verify. If your verify steps or CI still run this check, remove the "adoption" step from scripts/lib/verify-steps.mjs and the "adoption" job from .github/workflows/ci.yml (docs/migration-notes.md).',
    ].join('\n'),
  );
  process.exit(2);
}

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

/**
 * `design` is the image-guided composition proof (scripts/lib/design/
 * proof.mjs): both groups removed, two pages built from reference images.
 * Its nested verify skips what it cannot affect and the other scenarios
 * already run (the Storybook suites, the generator check), so the browser
 * matrix is not repeated for nothing.
 * @type {Record<string, { flags: string[], product?: boolean, design?: boolean, skip?: string[] }>}
 */
const SCENARIOS = {
  demo: { flags: ['--remove-demo'] },
  reference: { flags: ['--remove-reference'] },
  all: { flags: ['--remove-demo', '--remove-reference'] },
  product: { flags: ['--remove-demo', '--remove-reference'], product: true },
  design: {
    flags: ['--remove-demo', '--remove-reference'],
    design: true,
    skip: ['storybook', 'storybook-build', 'generator'],
  },
};
const selected = values.scenario?.length
  ? values.scenario
  : Object.keys(SCENARIOS);

/** Groups every adoption run removes (no flag): the starter-only checks. */
const ALWAYS_REMOVED = Object.keys(manifest.groups).filter(
  (group) => !manifest.groups[group]?.flag,
);

const report = createReport('adopt:check');

/**
 * Branding: every environment names the product.
 * @param {ReturnType<typeof createWorkspace>} workspace
 */
const brand = (workspace) => {
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
};

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

    for (const group of [...groups, ...ALWAYS_REMOVED]) {
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

    // The adopted project's own setup, as its team runs it (no
    // STARTER_NESTED_VERIFY): this check verifies the starter and cannot
    // pass there, so neither verify nor CI may run it, and running it by
    // hand is refused. The scenario name is unknown on purpose: a copy that
    // does not refuse fails at once instead of starting its own scenarios.
    const steps = workspace.run('node', ['scripts/verify.mjs', '--list'], {
      quiet: true,
    });
    const ci = readFileSync(
      path.join(workspace.dir, '.github/workflows/ci.yml'),
      'utf8',
    );
    report.step(
      `${name}: the adopted project's verify and CI do not run the adoption check`,
      steps.status === 0 &&
        !/^\s*adoption\s/m.test(steps.output) &&
        !ci.includes('adopt:check'),
      `${steps.output}\nci.yml mentions adopt:check: ${ci.includes('adopt:check')}`,
    );
    const refused = workspace.run(
      'node',
      ['scripts/check-adoption.mjs', '--scenario', 'adopted-project'],
      { quiet: true },
    );
    report.step(
      `${name}: adopt:check refuses to run in the adopted project`,
      refused.status === 2 &&
        refused.output.includes('verifies the starter') &&
        !refused.output.includes('manifest records'),
      `exit ${refused.status}\n${refused.output}`,
    );

    if (scenario.product || scenario.design) brand(workspace);
    if (scenario.design) {
      const { evidence } = runDesignProof({
        projectRoot,
        workspace,
        report,
        name,
      });
      console.log(`[adopt:check] ${name}: evidence copied to ${evidence}`);
    }
    if (scenario.product) {
      for (const [label, command, args] of PRODUCT_STEPS) {
        const result = workspace.run(command, args, { quiet: true });
        report.step(`${name}: ${label}`, result.status === 0, result.output);
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

    // What an adopted project's own `pnpm verify` runs, minus the audit
    // (STARTER_NESTED_VERIFY, which also refuses verify → adopt:check →
    // verify).
    console.log(`[adopt:check] ${name}: running the adopted project's verify…`);
    const verified = workspace.run(
      'node',
      [
        'scripts/verify.mjs',
        ...(scenario.skip ?? []).flatMap((id) => ['--skip', id]),
      ],
      {
        quiet: true,
        env: { STARTER_NESTED_VERIFY: '1' },
      },
    );
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
