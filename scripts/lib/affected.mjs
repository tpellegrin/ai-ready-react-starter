// @ts-check
/**
 * Conservative check selection for `pnpm verify --affected` (development
 * only; `pnpm verify` and CI stay authoritative for merging).
 *
 * Input: changed files with their git status (added, modified, deleted,
 * renamed — both names), from the working tree, the index and an optional
 * comparison base. Output: which verify steps to run, which to skip, and
 * why. Narrowing is used only where impact is bounded: Prettier and
 * Stylelint per file, ESLint for tests, stories and e2e (nothing imports
 * them), `vitest related` for unit tests (it follows the real module graph)
 * and changed stories alone. Shared code, copy and assets run whole suites;
 * anything the rules below do not recognize selects everything.
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
/** Binary media: bundled by the builds, never formatted. */
const BINARY_ASSET =
  /\.(woff2?|ttf|otf|eot|png|jpe?g|gif|webp|avif|ico|bmp|mp3|mp4|webm|wav|ogg|pdf)$/i;

const isDoc = (/** @type {string} */ file) => /\.md$/.test(file);
const isSourceCode = (/** @type {string} */ file) =>
  /^src\/.*\.tsx?$/.test(file);
const isStory = (/** @type {string} */ file) => /\.stories\.tsx?$/.test(file);
const isTestOrStory = (/** @type {string} */ file) =>
  /\.(test|stories)\.tsx?$|\/__tests__\//.test(file);
const isLocale = (/** @type {string} */ file) =>
  /^src\/i18n\/locales\/[^/]+\.json$/.test(file);
/** Files code imports by URL (fonts, images, media) or ships as text. */
const isAsset = (/** @type {string} */ file) =>
  /^src\/assets\//.test(file) &&
  (BINARY_ASSET.test(file) || /\.(svg|txt)$/i.test(file));
const isE2e = (/** @type {string} */ file) => /^e2e\/.*\.ts$/.test(file);

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
  const sample = (/** @type {string[]} */ list) =>
    `${list.slice(0, 3).join(', ')}${list.length > 3 ? ', …' : ''}`;
  const global = files.filter((file) => GLOBAL.some((p) => p.test(file)));
  if (global.length) {
    return all(
      `tooling, configuration or dependencies changed (${sample(global)})`,
    );
  }
  // Only categories whose impact the rules below bound; anything else (a
  // new file type in src/, public/, other folders) selects everything.
  const known = (/** @type {string} */ file) =>
    isDoc(file) ||
    isLocale(file) ||
    isAsset(file) ||
    isSourceCode(file) ||
    isE2e(file) ||
    file === 'LICENSE';
  const unknown = files.filter((file) => !known(file));
  if (unknown.length) {
    return all(`impact of ${sample(unknown)} is unknown`);
  }
  const movedAssets = changes
    .filter((c) => (c.status === 'D' || c.status === 'R') && isAsset(c.path))
    .map((c) => c.path);
  if (movedAssets.length) {
    return all(
      `asset deleted or renamed (${sample(movedAssets)}): whatever imports it may break anywhere`,
    );
  }

  const removed = changes.some((c) => c.status === 'D' || c.status === 'R');
  const present = files.filter(existing);
  const source = files.filter(isSourceCode);
  const productionSource = source.filter((file) => !isTestOrStory(file));
  const e2e = files.filter(isE2e);
  const locales = files.filter(isLocale);
  const assets = files.filter(isAsset);
  const typescript = [...source, ...e2e];
  /** What the app, its stories and its builds load: */
  const loaded = [...productionSource, ...locales, ...assets];

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

  // Prettier: never binary assets; --ignore-unknown skips other types it
  // cannot parse (as `prettier --check .` does).
  const formattable = present.filter((file) => !BINARY_ASSET.test(file));
  if (formattable.length) {
    decide('format', `${formattable.length} changed file(s)`, [
      'exec',
      'prettier',
      '--check',
      '--ignore-unknown',
      ...formattable,
    ]);
  } else {
    skip(
      'format',
      present.length ? 'only binary assets changed' : 'only deletions',
    );
  }

  if (!typescript.length) skip('lint', 'no TypeScript changes');
  else if (productionSource.length || removed) {
    decide(
      'lint',
      removed
        ? 'files were deleted or renamed: importers must be re-linted'
        : `production code changed (${productionSource[0]}): type-aware rules re-check every importer`,
    );
  } else {
    // Tests and stories have no importers, except helpers in __tests__
    // folders (lint the folder) and the e2e suite (specs import fixtures).
    const targets = new Set(
      present
        .filter(isSourceCode)
        .map((file) => file.replace(/(\/__tests__)\/.*$/, '$1')),
    );
    if (e2e.length) targets.add('e2e');
    decide('lint', 'only tests, stories or e2e changed', [
      'exec',
      'eslint',
      ...targets,
      '--max-warnings=0',
      '--format',
      'json',
      '--output-file',
      '{artifact}',
    ]);
  }

  const presentSource = present.filter(isSourceCode);
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

  // Message keys are typed from the en-US locale.
  if (typescript.length || locales.length) {
    decide(
      'typecheck',
      `${typescript.length ? 'TypeScript' : 'locales'} changed (incremental, whole project)`,
    );
  } else skip('typecheck', 'no TypeScript or locale changes');

  if (source.length || locales.length) {
    decide('i18n', 'source or locales changed');
  } else skip('i18n', 'no source or locale changes');

  decide('docs', 'cheap; docs, links and command references');
  decide(
    'architecture',
    source.length ? 'source changed (fixtures + suppression scan)' : null,
  );
  if (!source.length) skip('architecture', 'no source changes');

  skip('tooling', 'scripts/ unchanged');

  if (!source.length && !locales.length) {
    skip('unit', 'no source or locale changes');
  } else if (
    removed ||
    locales.length ||
    files.some((f) => /^src\/(mocks|test)\//.test(f))
  ) {
    decide(
      'unit',
      locales.length
        ? 'locales changed: tests assert copy, so all tests'
        : 'deletions, renames or shared test infrastructure: all tests',
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

  const buildReason = loaded.length
    ? `${assets.length ? 'assets' : productionSource.length ? 'production source' : 'locales'} changed (bundled)`
    : null;
  for (const id of ['build', 'check-build', 'build-demo', 'check-build-demo']) {
    decide(id, buildReason);
    if (!buildReason) skip(id, 'no production source, locale or asset changes');
  }

  // Which stories a change reaches is not knowable from folders: stories
  // render shared components (Dialog renders Button), and the Storybook
  // preview loads providers, fonts, copy and every feature's mocks. Only a
  // change to stories alone runs just those stories.
  const stories = present.filter(isStory);
  if (loaded.length) {
    decide(
      'storybook',
      `${loaded[0]} can reach any story (shared UI, the preview's providers, copy, fonts and mocks): every story`,
    );
  } else if (stories.length) {
    decide('storybook', 'only stories changed: those stories', [
      'exec',
      'vitest',
      'run',
      '--project',
      'storybook',
      ...stories,
      '--reporter=default',
      '--reporter=json',
      '--outputFile.json={artifact}',
    ]);
  } else skip('storybook', 'no stories or code they load changed');
  if (assets.length) {
    decide('storybook-build', 'assets changed (bundled into the catalog)');
  } else
    skip('storybook-build', 'Storybook configuration and assets unchanged');

  const journeys = [...loaded, ...e2e];
  if (journeys.length) {
    decide('e2e', `journeys may change (${journeys[0]})`);
  } else {
    skip('e2e', 'only tests, stories or docs changed');
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
