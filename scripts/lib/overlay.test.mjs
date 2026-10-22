import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { planOverlay, sha256 } from './overlay.mjs';

/** @type {string[]} */
const dirs = [];
afterEach(() => {
  for (const dir of dirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

const GENERATED = 'export const Panel = () => null;\n';

/**
 * A copy with "generated" files and an overlay folder next to it.
 * @param {Record<string, string>} overlayFiles  files/ contents
 */
const setup = (overlayFiles = {}) => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'overlay-test-'));
  dirs.push(base);
  const root = path.join(base, 'copy');
  const overlayDir = path.join(base, 'overlay');
  /** @param {string} dir @param {Record<string, string>} files */
  const write = (dir, files) => {
    for (const [file, content] of Object.entries(files)) {
      fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
      fs.writeFileSync(path.join(dir, file), content);
    }
  };
  write(root, {
    'src/features/notes/components/Panel/index.tsx': GENERATED,
    'src/features/notes/components/Panel/logic.test.ts': 'test\n',
    'src/features/notes/index.ts':
      "export { Panel } from './components/Panel';\n// starter:gen exports\n",
    'src/i18n/locales/en-US.json': JSON.stringify({
      notes: { title: 'Notes', intro: 'What people can do on the notes page.' },
    }),
    'scripts/check-build.mjs':
      "const LAZY_MODULES = {\n  production: [\n    'a',\n  ],\n};\n",
  });
  write(path.join(overlayDir, 'files'), overlayFiles);
  write(path.join(overlayDir, 'copy'), {
    'en-US.json': JSON.stringify({
      notes: { intro: 'Write things down.', empty: 'No notes yet' },
    }),
  });
  const read = (/** @type {string} */ file) =>
    fs.readFileSync(path.join(root, file), 'utf8');
  return { root, overlayDir, read };
};

const panel = 'src/features/notes/components/Panel/index.tsx';
const overlay = {
  replace: { [panel]: sha256(GENERATED) },
  remove: {
    'src/features/notes/components/Panel/logic.test.ts': sha256('test\n'),
  },
  insert: [
    {
      file: 'src/features/notes/index.ts',
      marker: 'starter:gen exports',
      lines: ["export { parseNote } from './model';"],
    },
  ],
  copyReplace: { 'notes.intro': 'What people can do on the notes page.' },
  lazyModules: ['src/views/user/Notes/index.tsx'],
};

describe('planOverlay', () => {
  it('replaces checked generated files, inserts at markers, merges copy and keeps pages lazy', () => {
    const { root, overlayDir, read } = setup({
      [panel]: 'export const Panel = () => <ul />;\n',
      'src/features/notes/model.ts': 'export const parseNote = () => 1;\n',
    });
    const plan = planOverlay({ root, overlayDir, overlay });
    expect(plan.problems).toEqual([]);
    const result = plan.write?.();
    expect(result?.removed).toEqual([
      'src/features/notes/components/Panel/logic.test.ts',
    ]);
    expect(read(panel)).toContain('<ul />');
    expect(read('src/features/notes/model.ts')).toContain('parseNote');
    expect(read('src/features/notes/index.ts')).toBe(
      "export { Panel } from './components/Panel';\nexport { parseNote } from './model';\n// starter:gen exports\n",
    );
    expect(JSON.parse(read('src/i18n/locales/en-US.json'))).toEqual({
      notes: {
        title: 'Notes',
        intro: 'Write things down.',
        empty: 'No notes yet',
      },
    });
    expect(read('scripts/check-build.mjs')).toContain(
      "production: ['src/views/user/Notes/index.tsx', ",
    );
  });

  it('fails visibly when a generated file changed, and writes nothing', () => {
    const { root, overlayDir, read } = setup({ [panel]: 'mine\n' });
    fs.writeFileSync(path.join(root, panel), 'a new template\n');
    const plan = planOverlay({ root, overlayDir, overlay });
    expect(plan.write).toBeNull();
    expect(plan.problems).toEqual([
      expect.stringMatching(
        /index\.tsx is not the generated file this overlay was written against .* A template or generator changed/,
      ),
    ]);
    expect(read(panel)).toBe('a new template\n');
  });

  it('refuses to overwrite files it does not declare, and declarations without files', () => {
    const { root, overlayDir } = setup({ [panel]: 'mine\n' });
    const plan = planOverlay({
      root,
      overlayDir,
      overlay: { replace: { 'src/other.ts': sha256('x') } },
    });
    expect(plan.problems).toEqual([
      `${panel} exists and the overlay does not declare that it replaces it (overlay.json "replace").`,
      'overlay.json replaces src/other.ts, but files/src/other.ts does not exist.',
      'en-US.json: "notes.intro" already exists; the plan would replace its text',
    ]);
  });

  it('replaces generated copy only while it is still the placeholder', () => {
    const { root, overlayDir } = setup({ [panel]: 'mine\n' });
    fs.writeFileSync(
      path.join(root, 'src/i18n/locales/en-US.json'),
      JSON.stringify({ notes: { title: 'Notes', intro: 'Edited by hand' } }),
    );
    expect(planOverlay({ root, overlayDir, overlay }).problems).toEqual([
      'en-US.json: "notes.intro" is "Edited by hand", not the generated placeholder "What people can do on the notes page." the overlay replaces.',
    ]);
  });

  it('reports a missing marker and a removed file that was never generated', () => {
    const { root, overlayDir } = setup({ [panel]: 'mine\n' });
    fs.writeFileSync(path.join(root, 'src/features/notes/index.ts'), '');
    fs.rmSync(
      path.join(root, 'src/features/notes/components/Panel/logic.test.ts'),
    );
    expect(planOverlay({ root, overlayDir, overlay }).problems).toEqual([
      'src/features/notes/components/Panel/logic.test.ts should be removed, but nothing generated it.',
      'src/features/notes/index.ts: marker "starter:gen exports" not found.',
    ]);
  });
});
