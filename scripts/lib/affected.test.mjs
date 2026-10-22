import { describe, expect, it } from 'vitest';

import { parseNameStatus, selectAffected } from './affected.mjs';

const steps = [
  'format',
  'lint',
  'stylelint',
  'typecheck',
  'i18n',
  'docs',
  'architecture',
  'tooling',
  'unit',
  'audit',
  'coverage',
  'build',
  'check-build',
  'storybook',
  'storybook-build',
  'e2e',
  'generator',
  'adoption',
].map((id) => ({ id }));
const always = { existing: () => true };
/**
 * @param {Array<[import('./affected.mjs').Change['status'], string]>} entries
 * @returns {import('./affected.mjs').Change[]}
 */
const changes = (entries) =>
  entries.map(([status, path]) => ({ status, path }));
const ids = (/** @type {{ id: string }[]} */ list) => list.map((s) => s.id);

describe('selectAffected', () => {
  it('runs nothing without changes', () => {
    const selection = selectAffected([], steps, always);
    expect(selection.selected).toEqual([]);
    expect(selection.skipped).toHaveLength(steps.length);
  });

  it.each([
    'package.json',
    'pnpm-lock.yaml',
    'eslint/boundaries.js',
    'scripts/gen.mjs',
    '.github/workflows/ci.yml',
    'src/test/setup.ts',
    'vite.config.ts',
  ])(
    'selects everything when tooling or configuration changes (%s)',
    (file) => {
      const selection = selectAffected(changes([['M', file]]), steps, always);
      expect(selection.full).toBe(true);
      expect(ids(selection.selected)).toEqual(ids(steps));
    },
  );

  it('selects everything when it cannot classify a change', () => {
    const selection = selectAffected(
      changes([['A', 'tools/new.sh']]),
      steps,
      always,
    );
    expect(selection.full).toBe(true);
    expect(selection.reasons[0]).toContain('unknown');
  });

  it('narrows unit tests to a feature change, re-linting its importers', () => {
    const file = 'src/features/notes/components/NotePanel/logic.ts';
    const selection = selectAffected(changes([['M', file]]), steps, always);
    const byId = Object.fromEntries(selection.selected.map((s) => [s.id, s]));

    expect(byId.unit?.argv).toEqual(
      expect.arrayContaining(['vitest', 'related', file]),
    );
    // Type-aware rules read the changed module's types in its importers.
    expect(byId.lint?.argv).toBeUndefined();
    expect(byId.typecheck?.argv).toBeUndefined();
    expect(ids(selection.selected)).toEqual(
      expect.arrayContaining(['build', 'check-build', 'storybook', 'e2e']),
    );
    expect(ids(selection.skipped)).toEqual(
      expect.arrayContaining(['audit', 'coverage', 'generator', 'adoption']),
    );
    expect(
      selection.skipped.find((s) => s.id === 'coverage')?.reason,
    ).toContain('pnpm verify');
  });

  it('narrows lint to changed tests, which nothing imports', () => {
    const file = 'src/features/notes/components/NotePanel/NotePanel.test.tsx';
    const selection = selectAffected(changes([['M', file]]), steps, always);
    const byId = Object.fromEntries(selection.selected.map((s) => [s.id, s]));

    expect(byId.lint?.argv).toEqual(expect.arrayContaining(['eslint', file]));
    expect(ids(selection.skipped)).toEqual(
      expect.arrayContaining(['storybook', 'e2e', 'build']),
    );
  });

  it('re-lints everything when a shared layer changes, and includes e2e', () => {
    const selection = selectAffected(
      changes([['M', 'src/components/Button/index.tsx']]),
      steps,
      always,
    );
    const lint = selection.selected.find((s) => s.id === 'lint');
    expect(lint?.argv).toBeUndefined();
    expect(lint?.reason).toContain('importer');
    expect(ids(selection.selected)).toContain('e2e');
  });

  it.each([
    // Dialog, ConfirmDialog and Toast stories render Button.
    'src/components/Button/index.tsx',
    'src/hooks/useMediaQuery.ts',
    'src/i18n/provider.tsx',
    // The Storybook preview loads every feature's mocks (src/mocks/handlers).
    'src/features/notes/mocks/handlers.ts',
    'src/features/notes/components/NotePanel/index.tsx',
  ])('runs every story when production code changes (%s)', (file) => {
    const selection = selectAffected(changes([['M', file]]), steps, always);
    const storybook = selection.selected.find((s) => s.id === 'storybook');
    expect(storybook).toBeDefined();
    expect(storybook?.argv).toBeUndefined();
    expect(storybook?.reason).toContain('every story');
  });

  it('runs only the changed stories when nothing else changed', () => {
    const story = 'src/components/Dialog/Dialog.stories.tsx';
    const selection = selectAffected(changes([['M', story]]), steps, always);
    const storybook = selection.selected.find((s) => s.id === 'storybook');
    expect(storybook?.argv).toEqual(
      expect.arrayContaining([
        'vitest',
        'run',
        '--project',
        'storybook',
        story,
      ]),
    );
    expect(storybook?.argv).not.toContain('src/components/Dialog');
  });

  it('checks the builds, stories and journeys for a font, without Prettier', () => {
    const font = 'src/assets/fonts/Inter/Inter-Regular.ttf';
    const selection = selectAffected(changes([['M', font]]), steps, always);
    const byId = Object.fromEntries(selection.selected.map((s) => [s.id, s]));

    expect(selection.full).toBe(false);
    expect(ids(selection.selected)).toEqual(
      expect.arrayContaining([
        'build',
        'check-build',
        'storybook',
        'storybook-build',
        'e2e',
      ]),
    );
    expect(byId.storybook?.argv).toBeUndefined();
    expect(byId.format).toBeUndefined();
    expect(selection.skipped.find((s) => s.id === 'format')?.reason).toContain(
      'binary',
    );
    for (const choice of selection.selected) {
      expect(choice.argv ?? []).not.toContain(font);
    }
  });

  it('formats text next to binary assets, ignoring types Prettier cannot read', () => {
    const selection = selectAffected(
      changes([
        ['M', 'src/assets/fonts/Inter/Inter-Regular.ttf'],
        ['M', 'src/assets/fonts/Inter/OFL.txt'],
      ]),
      steps,
      always,
    );
    expect(selection.selected.find((s) => s.id === 'format')?.argv).toEqual([
      'exec',
      'prettier',
      '--check',
      '--ignore-unknown',
      'src/assets/fonts/Inter/OFL.txt',
    ]);
  });

  it.each([
    [[['D', 'src/assets/fonts/Inter/Inter-Medium.ttf']], 'asset'],
    [[['A', 'src/styles/legacy.css']], 'unknown'],
    [[['A', 'src/features/notes/seed.csv']], 'unknown'],
    [[['A', 'src/assets/video/intro.mov']], 'unknown'],
  ])(
    'selects everything when an asset is removed or a file type is unknown (%j)',
    (entries, reason) => {
      const selection = selectAffected(
        changes(
          /** @type {Array<[import('./affected.mjs').Change['status'], string]>} */ (
            entries
          ),
        ),
        steps,
        always,
      );
      expect(selection.full).toBe(true);
      expect(selection.reasons[0]).toContain(reason);
    },
  );

  it('re-runs everything that renders copy when a locale changes', () => {
    const selection = selectAffected(
      changes([['M', 'src/i18n/locales/pt-BR.json']]),
      steps,
      always,
    );
    const byId = Object.fromEntries(selection.selected.map((s) => [s.id, s]));
    expect(ids(selection.selected)).toEqual(
      expect.arrayContaining([
        'typecheck',
        'i18n',
        'unit',
        'build',
        'storybook',
        'e2e',
      ]),
    );
    expect(byId.unit?.argv).toBeUndefined();
    expect(byId.storybook?.argv).toBeUndefined();
  });

  it('lints and type-checks the e2e suite when its files change', () => {
    const selection = selectAffected(
      changes([['M', 'e2e/fixtures.ts']]),
      steps,
      always,
    );
    const byId = Object.fromEntries(selection.selected.map((s) => [s.id, s]));
    // Specs import the fixtures: lint the whole suite.
    expect(byId.lint?.argv).toEqual(expect.arrayContaining(['eslint', 'e2e']));
    expect(ids(selection.selected)).toEqual(
      expect.arrayContaining(['typecheck', 'e2e']),
    );
    expect(ids(selection.skipped)).toEqual(
      expect.arrayContaining(['storybook', 'unit']),
    );
  });

  it('runs every unit test and lint after deletions or renames', () => {
    const selection = selectAffected(
      changes([
        ['R', 'src/features/notes/model.ts'],
        ['R', 'src/features/notes/schema.ts'],
      ]),
      steps,
      { existing: (file) => file.endsWith('schema.ts') },
    );
    const byId = Object.fromEntries(selection.selected.map((s) => [s.id, s]));
    expect(byId.lint?.argv).toBeUndefined();
    expect(byId.unit?.argv).toBeUndefined();
    expect(byId.format?.argv).toEqual([
      'exec',
      'prettier',
      '--check',
      '--ignore-unknown',
      'src/features/notes/schema.ts',
    ]);
  });

  it('checks only formatting and docs for a docs change', () => {
    const selection = selectAffected(
      changes([['M', 'docs/flows.md']]),
      steps,
      always,
    );
    expect(ids(selection.selected)).toEqual(['format', 'docs']);
  });
});

describe('parseNameStatus', () => {
  it('reads statuses, keeping both names of a rename', () => {
    expect(
      parseNameStatus(
        'M\tsrc/a.ts\nR100\tsrc/b.ts\tsrc/c.ts\nD\tsrc/d.ts\nA\tdocs/e.md\n',
      ),
    ).toEqual([
      { status: 'M', path: 'src/a.ts' },
      { status: 'R', path: 'src/b.ts' },
      { status: 'R', path: 'src/c.ts' },
      { status: 'D', path: 'src/d.ts' },
      { status: 'A', path: 'docs/e.md' },
    ]);
  });
});
