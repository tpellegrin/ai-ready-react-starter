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

  it('narrows lint, styles and tests to a feature-only change', () => {
    const file = 'src/features/notes/components/NotePanel/logic.ts';
    const selection = selectAffected(changes([['M', file]]), steps, always);
    const byId = Object.fromEntries(selection.selected.map((s) => [s.id, s]));

    expect(byId.lint?.argv).toEqual(expect.arrayContaining(['eslint', file]));
    expect(byId.unit?.argv).toEqual(
      expect.arrayContaining(['vitest', 'related', file]),
    );
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

  it('re-lints everything when a shared layer changes, and includes e2e', () => {
    const selection = selectAffected(
      changes([['M', 'src/components/Button/index.tsx']]),
      steps,
      always,
    );
    const lint = selection.selected.find((s) => s.id === 'lint');
    expect(lint?.argv).toBeUndefined();
    expect(lint?.reason).toContain('shared layer');
    expect(ids(selection.selected)).toContain('e2e');
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
