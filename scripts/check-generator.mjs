#!/usr/bin/env node
// @ts-check
/**
 * Verifies `pnpm gen` end to end in a temporary copy of the project
 * (`pnpm gen:check`; the checkout itself is never modified):
 *
 * 1. --dry-run writes nothing, for every generator; unsafe names, paths,
 *    groups, duplicate components, existing features, paths and flows,
 *    flow steps that normalize to the same names, and copy that would
 *    replace or reshape an existing translation are refused without
 *    writing anything, in dry runs and real runs alike.
 * 2. Every generator runs (feature, shared and feature components, user and
 *    guest pages, a flow) and refuses to run twice; registrations land in
 *    the existing registries (paths, routes, navigation, mock handlers) and
 *    new copy merges into existing groups, leaving every translation as it
 *    was.
 * 3. Everything generated passes the same gates as hand-written code:
 *    typecheck, lint (type-aware, boundaries, component rules), Stylelint,
 *    Prettier, i18n checks, the flow contract and its own tests.
 *
 * It depends on no removable example code: the "existing" cases use
 * placeholders this check creates (and removes) itself, so it passes in
 * adopted projects too (`pnpm adopt:check` runs it after each adoption).
 * Stories of generated shared components are type-checked and linted here;
 * the Storybook run (browsers) belongs to `pnpm verify`.
 *
 * Pass --keep to leave the copy on disk for inspection.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { flattenMessages } from './lib/i18n.mjs';
import { createReport, createWorkspace } from './lib/workspace.mjs';

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
const keep = process.argv.includes('--keep');
const workspace = createWorkspace(projectRoot, 'starter-gen-check-');
const report = createReport('gen:check');
console.log(`[gen:check] Workspace: ${workspace.dir}\n`);

const gen = (/** @type {string[]} */ args, quiet = true) =>
  workspace.run('node', ['scripts/gen.mjs', ...args], { quiet });
const read = (/** @type {string} */ file) =>
  fs.readFileSync(path.join(workspace.dir, file), 'utf8');

/** Generations, in dependency order (the view renders the feature panel). */
const GENERATED = /** @type {Array<[string, string[]]>} */ ([
  ['feature', ['feature', 'sample-items']],
  ['shared component', ['component', 'SampleBadge']],
  [
    'feature component with logic',
    ['component', 'SampleItemSummary', '--feature', 'sample-items', '--logic'],
  ],
  [
    'user page with the feature and a nav link',
    [
      'view',
      'SampleItems',
      '--group',
      'user',
      '--feature',
      'sample-items',
      '--nav',
    ],
  ],
  [
    'guest page (eager route)',
    ['view', 'SamplePublic', '--group', 'guest', '--eager'],
  ],
  [
    'flow',
    [
      'flow',
      'sample-setup',
      '--group',
      'user',
      '--steps',
      'start,details,finish',
    ],
  ],
]);

/**
 * Placeholders for the "already exists" cases, removed before generating.
 * @type {Array<[string, string]>}
 */
const PLACEHOLDERS = [
  ['src/features/gen-check-existing/index.ts', 'export {};\n'],
  [
    'src/components/GenCheckExisting/index.tsx',
    'export const GenCheckExisting = () => null;\n',
  ],
];
/**
 * Placeholder copy in every locale for the translation-conflict cases (the
 * flow "gen-check" writes genCheck.<step>.title/body), restored before
 * generating.
 */
const PLACEHOLDER_COPY = {
  genCheck: {
    existingText: 'A text that must not become a group',
    existingGroup: { title: { short: 'A group that must not become a text' } },
    existingStep: { title: 'A text that must not be replaced' },
  },
};
const LOCALES = 'src/i18n/locales';
const localeFiles = fs
  .readdirSync(path.join(workspace.dir, LOCALES))
  .filter((file) => file.endsWith('.json') && file !== 'pseudo.json')
  .map((file) => `${LOCALES}/${file}`);
/** @param {string} text @returns {unknown} */
const parseJson = (text) => JSON.parse(text);
/** @param {string} file */
const readLocale = (file) =>
  /** @type {Record<string, unknown>} */ (parseJson(read(file)));
const originalLocales = new Map(localeFiles.map((file) => [file, read(file)]));

try {
  for (const [file, content] of PLACEHOLDERS) {
    fs.mkdirSync(path.dirname(path.join(workspace.dir, file)), {
      recursive: true,
    });
    fs.writeFileSync(path.join(workspace.dir, file), content);
  }
  for (const file of localeFiles) {
    fs.writeFileSync(
      path.join(workspace.dir, file),
      `${JSON.stringify({ ...readLocale(file), ...PLACEHOLDER_COPY }, null, 2)}\n`,
    );
  }

  const before = workspace.snapshot();
  /** @type {Array<[string[], string]>} */
  const refusals = [
    [['feature', 'gen-check-existing'], 'an existing feature'],
    [['feature', '../outside'], 'path traversal'],
    [['feature', 'src/features/x'], 'a nested path'],
    [['feature', 'Bad_Name'], 'an invalid feature name'],
    [['feature', 'mocks'], 'a reserved name'],
    [['feature', 'sample-items', '--entity', 'lowercase'], 'an invalid entity'],
    [
      ['feature', 'sample-items', '--group', 'user'],
      'an option the generator does not take',
    ],
    [['component', 'GenCheckExisting'], 'a duplicate shared component'],
    [['component', 'lowercase'], 'an invalid component name'],
    [
      ['component', 'SampleCard', '--feature', 'missing-feature'],
      'a missing feature',
    ],
    [['view', 'SamplePage'], 'a page without a route group'],
    [['view', 'SamplePage', '--group', 'onboarding'], 'the onboarding group'],
    [
      ['view', 'SamplePage', '--group', 'user', '--path', 'no-slash'],
      'an invalid path',
    ],
    [
      ['view', 'SamplePage', '--group', 'user', '--path', '/flow/x'],
      'a page under /flow/',
    ],
    [['view', 'SamplePage', '--group', 'guest', '--nav'], 'a guest nav link'],
    [
      [
        'view',
        'SamplePage',
        '--group',
        'user',
        '--feature',
        'gen-check-existing',
      ],
      'a feature without a generated panel',
    ],
    [
      ['flow', 'sample-flow', '--group', 'user', '--steps', 'only'],
      'a flow with one step',
    ],
    [
      ['flow', 'sampleFlow', '--group', 'user', '--steps', 'a,b'],
      'a camelCase flow id',
    ],
    [
      ['flow', 'sample-flow', '--group', 'user', '--steps', 'a,a'],
      'duplicate steps',
    ],
    [
      ['flow', 'sample-flow', '--group', 'user', '--steps', 'a-1,a1'],
      'steps that normalize to the same key, component and folder',
    ],
    [
      ['flow', 'gen-check', '--group', 'user', '--steps', 'existing-text,b'],
      'copy that would turn an existing text into a group',
    ],
    [
      ['flow', 'gen-check', '--group', 'user', '--steps', 'existing-group,b'],
      'copy that would turn an existing group into a text',
    ],
    [
      ['flow', 'gen-check', '--group', 'user', '--steps', 'existing-step,b'],
      'copy that would replace an existing text',
    ],
    [['widget', 'sample'], 'an unknown generator'],
  ];
  // Dry runs and real runs share the preflight checks: both must refuse.
  for (const [args, why] of refusals) {
    for (const mode of [['--dry-run'], []]) {
      const result = gen([...args, ...mode]);
      report.step(
        `refuses ${why}${mode.length ? ' (dry run)' : ''} (${args.join(' ')})`,
        result.status !== 0 && workspace.snapshot() === before,
        result.output,
      );
    }
  }

  // The gates below run on the real project, without the placeholders.
  for (const [file] of PLACEHOLDERS) {
    fs.rmSync(path.dirname(path.join(workspace.dir, file)), {
      recursive: true,
      force: true,
    });
  }
  for (const [file, text] of originalLocales) {
    fs.writeFileSync(path.join(workspace.dir, file), text);
  }
  const copyBefore = new Map(
    localeFiles.map((file) => [file, flattenMessages(readLocale(file))]),
  );

  for (const [label, args] of GENERATED) {
    const unchanged = workspace.snapshot();
    const dryRun = gen([...args, '--dry-run']);
    report.step(
      `dry run of the ${label} exits 0 and writes nothing`,
      dryRun.status === 0 && workspace.snapshot() === unchanged,
      dryRun.output,
    );
    const result = gen(args);
    report.step(`generates the ${label}`, result.status === 0, result.output);
  }

  const afterGeneration = workspace.snapshot();
  /** @type {Array<[string[], string]>} */
  const repeats = [
    [['feature', 'sample-items'], 'the generated feature'],
    [
      ['view', 'OtherItems', '--group', 'user', '--path', '/sample-items'],
      'a taken path',
    ],
    [
      ['flow', 'sample-setup', '--group', 'user', '--steps', 'a,b'],
      'an existing flow',
    ],
  ];
  for (const [args, why] of repeats) {
    const result = gen(args);
    report.step(
      `refuses to overwrite ${why}`,
      result.status !== 0 && workspace.snapshot() === afterGeneration,
      result.output,
    );
  }

  const paths = read('src/globals/paths.ts');
  const userRoutes = read('src/views/user/index.tsx');
  const guestRoutes = read('src/views/guest/index.tsx');
  const featureIndex = read('src/features/sample-items/index.ts');
  /** @type {Array<[string, boolean]>} */
  const registrations = [
    [
      'paths.sampleItems and paths.samplePublic',
      /sampleItems: '\/sample-items'/.test(paths) &&
        /samplePublic: '\/sample-public'/.test(paths),
    ],
    [
      "paths.flow['sample-setup'] with its steps in order",
      /'sample-setup': \{\s*start: '\/flow\/sample-setup\/start',\s*details: '\/flow\/sample-setup\/details',\s*finish: '\/flow\/sample-setup\/finish',/.test(
        paths,
      ),
    ],
    [
      'a lazy user route',
      /path: paths\.sampleItems,\s*lazy: \(\) =>/.test(userRoutes),
    ],
    [
      'an eager guest route',
      guestRoutes.includes(
        '{ path: paths.samplePublic, Component: SamplePublic }',
      ),
    ],
    [
      'the flow routes',
      userRoutes.includes("path: paths.flow['sample-setup'].finish"),
    ],
    [
      'the navigation link',
      read('src/views/user/common/UserPageLayout/index.tsx').includes(
        'paths.sampleItems',
      ),
    ],
    [
      'the mock handlers',
      read('src/mocks/handlers.ts').includes('...sampleItemHandlers,'),
    ],
    [
      "the feature component in the feature's public API",
      featureIndex.includes(
        "export { SampleItemSummary } from './components/SampleItemSummary';",
      ),
    ],
    [
      'no logic.ts for a presentational component',
      !fs.existsSync(
        path.join(workspace.dir, 'src/components/SampleBadge/logic.ts'),
      ),
    ],
  ];
  for (const [what, ok] of registrations) {
    report.step(`registers ${what}`, ok);
  }

  // The pages' copy joins existing groups (user, user.nav): a compatible
  // merge adds keys and leaves every existing translation as it was.
  for (const file of localeFiles) {
    const after = flattenMessages(readLocale(file));
    const changed = [...(copyBefore.get(file) ?? [])]
      .filter(([key, value]) => after.get(key) !== value)
      .map(([key]) => key);
    const added = [
      'user.sampleItems.title',
      'user.nav.sampleItems',
      'sampleSetup.details.body',
    ].filter((key) => typeof after.get(key) === 'string');
    report.step(
      `merges new copy into ${file} without changing existing translations`,
      changed.length === 0 && added.length === 3,
      `changed: ${changed.join(', ') || 'none'}; added: ${added.join(', ')}`,
    );
  }

  const generated = [
    'src/features/sample-items',
    'src/components/SampleBadge',
    'src/views/user/SampleItems',
    'src/views/guest/SamplePublic',
    'src/views/user/SampleSetup',
  ];
  const edited = [
    'src/globals/paths.ts',
    'src/views/user/index.tsx',
    'src/views/guest/index.tsx',
    'src/views/user/common/UserPageLayout/index.tsx',
    'src/mocks/handlers.ts',
  ];
  /** @type {Array<[string, string, string[]]>} */
  const gates = [
    ['typecheck', 'tsc', ['-b']],
    ['lint', 'eslint', [...generated, ...edited, '--max-warnings=0']],
    [
      'stylelint',
      'stylelint',
      [...generated.map((dir) => `${dir}/**/*.{ts,tsx}`), '--max-warnings=0'],
    ],
    [
      'format',
      'prettier',
      ['--check', ...generated, ...edited, 'src/i18n/locales'],
    ],
    ['i18n keys and placeholders', 'node', ['scripts/i18n-check.mjs']],
    ['pseudo-locale', 'node', ['scripts/i18n-pseudo.mjs', '--check']],
    [
      'the flow contract and its own tests',
      'vitest',
      [
        'run',
        '--project',
        'unit',
        ...generated,
        'src/containers/routing/flowContract.test.ts',
      ],
    ],
  ];
  for (const [label, command, args] of gates) {
    const result = workspace.run(command, args, { quiet: true });
    report.step(
      `generated code passes ${label}`,
      result.status === 0,
      result.output.slice(-4000),
    );
  }
} finally {
  if (keep) console.log(`\n[gen:check] Kept ${workspace.dir}`);
  else workspace.cleanup();
}
report.finish();
