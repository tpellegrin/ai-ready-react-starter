// @ts-check
/**
 * Conservative check selection for `pnpm verify --affected` (development
 * only; `pnpm verify` and CI stay authoritative for merging).
 *
 * Input: changed files with their git status (added, modified, deleted,
 * renamed — both names), from the working tree, the index and an optional
 * comparison base. Output: which verify steps to run (some narrowed to the
 * changed files, using ESLint/Stylelint/Prettier file arguments and
 * `vitest related`, which follows the real module graph), which to skip, and
 * why. Anything the rules below do not recognize selects everything.
 */

/**
 * @typedef {{ status: 'A' | 'M' | 'D' | 'R', path: string }} Change
 * @typedef {{ id: string, reason: string, argv?: string[] }} Selected
 * @typedef {{ id: string, reason: string }} Skipped
 * @typedef {{ full: boolean, reasons: string[], selected: Selected[], skipped: Skipped[] }} Selection
 */

/** Tooling, configuration and dependencies: impact cannot be bounded. */
const GLOBAL = [
  /^package\.json$/,
  /^pnpm-lock\.yaml$/,
  /^\.npmrc$/,
  /^\.nvmrc$/,
  /^tsconfig[\w.]*\.json$/,
  /^(vite|vitest|playwright|capacitor)\.config\.ts$/,
  /^eslint\.config\.js$/,
  /^eslint\//,
  /^\.stylelintrc\.cjs$/,
  /^\.prettier(rc\.cjs|ignore)$/,
  /^\.storybook\//,
  /^scripts\//,
  /^\.github\//,
  /^index\.html$/,
  /^\.env(\.[\w.-]+)?$/,
  /^starter\.manifest\.json$/,
  /^src\/test\//,
  /^src\/main\.tsx$/,
  /^src\/vite-env\.d\.ts$/,
  /^src\/[^/]+\.d\.ts$/,
];
/** Shared layers: many importers, so lint and unit-test everything. */
const SHARED_SOURCE =
  /^src\/(api|auth|components|config|containers|flows|forms|globals|guards|hooks|i18n|mocks|styles|utils)\//;
/** Paths whose behavior the e2e suite covers (routing, session, wiring). */
const E2E_SOURCE =
  /^src\/(api|auth|config|containers|demo|globals|guards|mocks|views|features)\//;
/** UI the Storybook suite renders. */
const STORY_SOURCE = /^src\/(components|styles|features)\/|\.stories\.tsx$/;

const isDoc = (/** @type {string} */ file) => /\.md$/.test(file);
const isSourceCode = (/** @type {string} */ file) =>
  /^src\/.*\.tsx?$/.test(file);
const isTestOrStory = (/** @type {string} */ file) =>
  /\.(test|stories)\.tsx?$|\/__tests__\//.test(file);
const isLocale = (/** @type {string} */ file) =>
  /^src\/i18n\/locales\/[^/]+\.json$/.test(file);

/**
 * @param {Change[]} changes
 * @param {Array<{ id: string }>} steps  verify steps, in order
 * @param {{ existing: (file: string) => boolean }} env
 * @returns {Selection}
 */
export const selectAffected = (changes, steps, { existing }) => {
  const ids = steps.map((step) => step.id);
  const all = (/** @type {string} */ reason) => ({
    full: true,
    reasons: [reason],
    selected: ids.map((id) => ({ id, reason })),
    skipped: [],
  });
  if (changes.length === 0) {
    return {
      full: false,
      reasons: ['no changes'],
      selected: [],
      skipped: ids.map((id) => ({ id, reason: 'no changes' })),
    };
  }

  const files = [...new Set(changes.map((c) => c.path))];
  const global = files.filter((file) => GLOBAL.some((p) => p.test(file)));
  if (global.length) {
    return all(
      `tooling, configuration or dependencies changed (${global.slice(0, 3).join(', ')}${global.length > 3 ? ', …' : ''})`,
    );
  }
  const known = (/** @type {string} */ file) =>
    isDoc(file) ||
    isLocale(file) ||
    file.startsWith('src/') ||
    file.startsWith('e2e/') ||
    file === 'LICENSE';
  const unknown = files.filter((file) => !known(file));
  if (unknown.length) {
    return all(`impact of ${unknown.slice(0, 3).join(', ')} is unknown`);
  }

  const removed = changes.some((c) => c.status === 'D' || c.status === 'R');
  const present = files.filter(existing);
  const source = files.filter(isSourceCode);
  const presentSource = present.filter(isSourceCode);
  const productionSource = source.filter((file) => !isTestOrStory(file));
  const shared = productionSource.filter((file) => SHARED_SOURCE.test(file));

  /** @type {Selected[]} */
  const selected = [];
  /** @type {Skipped[]} */
  const skipped = [];
  /** @param {string} id @param {string | null} reason @param {string[]} [argv] */
  const decide = (id, reason, argv) => {
    if (!ids.includes(id)) return;
    if (reason === null) return;
    selected.push(argv ? { id, reason, argv } : { id, reason });
  };
  /** @param {string} id @param {string} reason */
  const skip = (id, reason) => {
    if (ids.includes(id)) skipped.push({ id, reason });
  };

  decide(
    'format',
    present.length ? `${present.length} changed file(s)` : null,
    present.length ? ['exec', 'prettier', '--check', ...present] : undefined,
  );
  if (!present.length) skip('format', 'only deletions');

  if (!source.length) skip('lint', 'no source changes');
  else if (shared.length || removed) {
    decide(
      'lint',
      removed
        ? 'files were deleted or renamed: importers must be re-linted'
        : `shared layer changed (${shared[0]}): all importers are re-linted`,
    );
  } else {
    decide('lint', 'changed feature/view files only', [
      'exec',
      'eslint',
      ...presentSource,
      '--max-warnings=0',
      '--format',
      'json',
      '--output-file',
      '{artifact}',
    ]);
  }

  if (presentSource.length) {
    decide('stylelint', 'changed source files', [
      'exec',
      'stylelint',
      ...presentSource,
      '--max-warnings=0',
      '--formatter',
      'json',
      '--output-file',
      '{artifact}',
    ]);
  } else skip('stylelint', 'no changed source files');

  decide(
    'typecheck',
    source.length ? 'source changed (incremental, whole project)' : null,
  );
  if (!source.length) skip('typecheck', 'no source changes');

  const touchesCopy = source.length > 0 || files.some(isLocale);
  decide('i18n', touchesCopy ? 'source or locales changed' : null);
  if (!touchesCopy) skip('i18n', 'no source or locale changes');

  decide('docs', 'cheap; docs, links and command references');
  decide(
    'architecture',
    source.length ? 'source changed (fixtures + suppression scan)' : null,
  );
  if (!source.length) skip('architecture', 'no source changes');

  skip('tooling', 'scripts/ unchanged');

  if (!source.length) skip('unit', 'no source changes');
  else if (removed || files.some((f) => /^src\/(mocks|test)\//.test(f))) {
    decide(
      'unit',
      'deletions, renames or shared test infrastructure: all tests',
    );
  } else {
    decide('unit', 'tests related to the changed files (vitest related)', [
      'exec',
      'vitest',
      'related',
      '--run',
      '--project',
      'unit',
      ...presentSource,
      '--reporter=default',
      '--reporter=json',
      '--outputFile.json={artifact}',
    ]);
  }

  skip('audit', 'dependencies unchanged');
  skip('coverage', 'needs the full suite: run pnpm verify before merging');

  const buildReason = productionSource.length
    ? 'production source changed'
    : null;
  for (const id of ['build', 'check-build', 'build-demo', 'check-build-demo']) {
    decide(id, buildReason);
    if (!buildReason) skip(id, 'no production source changes');
  }

  const stories = files.filter((file) => STORY_SOURCE.test(file));
  if (stories.length) {
    decide(
      'storybook',
      `UI or stories changed (${stories[0]})`,
      shared.some((file) => /^src\/styles\//.test(file))
        ? undefined
        : [
            'exec',
            'vitest',
            'run',
            '--project',
            'storybook',
            ...[
              ...new Set(stories.map((file) => file.replace(/\/[^/]+$/, ''))),
            ],
            '--reporter=default',
            '--reporter=json',
            '--outputFile.json={artifact}',
          ],
    );
  } else skip('storybook', 'no UI or story changes');
  skip('storybook-build', 'Storybook configuration unchanged');

  const journeys = files.filter(
    (file) =>
      E2E_SOURCE.test(file) ||
      file.startsWith('e2e/') ||
      (SHARED_SOURCE.test(file) && !isTestOrStory(file)),
  );
  if (journeys.length) {
    decide('e2e', `journeys may change (${journeys[0]})`);
  } else {
    skip('e2e', 'no routing, session, view, shared-layer or e2e changes');
  }

  skip('generator', 'generator and templates unchanged');
  skip('adoption', 'adoption script and manifest unchanged');

  // Keep verify's order.
  selected.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
  skipped.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
  return {
    full: false,
    reasons: [
      `${files.length} changed file(s)${removed ? ', including deletions or renames' : ''}`,
    ],
    selected,
    skipped,
  };
};

/**
 * Parses `git diff --name-status` / `git status --porcelain` style lines.
 * @param {string} text
 * @returns {Change[]}
 */
export const parseNameStatus = (text) =>
  text
    .split('\n')
    .filter(Boolean)
    .flatMap((line) => {
      const [status = '', ...paths] = line.split('\t');
      const kind = status.charAt(0);
      if (kind === 'R' || kind === 'C') {
        return [
          { status: /** @type {const} */ ('R'), path: paths[0] ?? '' },
          { status: /** @type {const} */ ('R'), path: paths[1] ?? '' },
        ];
      }
      const normalized = kind === 'D' ? 'D' : kind === 'A' ? 'A' : 'M';
      return [
        {
          status: /** @type {Change['status']} */ (normalized),
          path: paths[0] ?? '',
        },
      ];
    })
    .filter((change) => change.path);
