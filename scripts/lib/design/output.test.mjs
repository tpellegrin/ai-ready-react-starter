import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { runScenarios } from './capture.mjs';
import { initTask } from './init.mjs';
import {
  createRunDir,
  preflight,
  resolveInside,
  writeNewFile,
} from './output.mjs';
import { parsePlan } from './plan.mjs';
import {
  DESKTOP,
  completePlan,
  createProject,
  projectWithPlan,
  withChanges,
} from './testing.mjs';

/**
 * Isolated file systems: every test builds its own temporary project (and,
 * for escapes, a folder outside it) and removes both.
 */
/** @type {string[]} */
const dirs = [];
afterEach(() => {
  for (const dir of dirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
const project = () => {
  const created = createProject();
  dirs.push(created.root);
  return created;
};
const outside = () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'design-outside-'));
  dirs.push(dir);
  return dir;
};
/** Every file under `dir`, relative to it. @param {string} dir @returns {string[]} */
const filesUnder = (dir) =>
  fs.existsSync(dir)
    ? fs
        .readdirSync(dir, { recursive: true, withFileTypes: true })
        .filter((entry) => entry.isFile())
        .map((entry) =>
          path.relative(dir, path.join(entry.parentPath, entry.name)),
        )
        .sort()
    : [];

describe('writes never follow a symlink', () => {
  it('refuses design/ linked into src/, in resolveInside, writes and init', async () => {
    const { root, write } = project();
    const src = filesUnder(path.join(root, 'src'));
    fs.symlinkSync(path.join(root, 'src'), path.join(root, 'design'));

    expect(() =>
      resolveInside(root, 'design', 'design/review/plan.json'),
    ).toThrow(
      'design is a symlink (to src); design commands do not write through links. Make design a real folder inside the project.',
    );
    expect(() =>
      writeNewFile(root, 'design', 'design/review/plan.json', '{}'),
    ).toThrow(/design is a symlink/);
    write('inbox/a.png', DESKTOP);
    const result = await initTask({
      root,
      task: 'review',
      images: [path.join(root, 'inbox/a.png')],
    });
    expect(result).toMatchObject({
      ok: false,
      problems: [expect.stringMatching(/^design is a symlink \(to src\)/)],
    });
    expect(filesUnder(path.join(root, 'src'))).toEqual(src);
  });

  it('refuses an evidence base linked into src/ or outside the project', () => {
    const { root } = project();
    fs.mkdirSync(path.join(root, 'reports'));
    fs.symlinkSync(path.join(root, 'src'), path.join(root, 'reports/design'));
    expect(() => createRunDir(root, 'notes-page', undefined)).toThrow(
      'reports/design is a symlink (to src); design commands do not write through links. Make reports/design a real folder inside the project.',
    );

    const other = project();
    const elsewhere = outside();
    fs.symlinkSync(elsewhere, path.join(other.root, 'reports'));
    expect(() => createRunDir(other.root, 'notes-page', 'run-1')).toThrow(
      `reports is a symlink (to ${fs.realpathSync(elsewhere)}); design commands do not write through links.`,
    );
    expect(filesUnder(elsewhere)).toEqual([]);
  });

  it('refuses nested links: a task folder, its references and a single file', async () => {
    const { root, write } = project();
    const elsewhere = outside();
    fs.mkdirSync(path.join(root, 'design/nested'), { recursive: true });
    fs.symlinkSync(
      path.join(root, 'src/views'),
      path.join(root, 'design/nested/references'),
    );
    write('inbox/a.png', DESKTOP);
    const result = await initTask({
      root,
      task: 'nested',
      images: [path.join(root, 'inbox/a.png')],
    });
    expect(result.problems).toEqual([
      'design/nested/references is a symlink (to src/views); design commands do not write through links. Make design/nested/references a real folder inside the project.',
    ]);
    expect(fs.existsSync(path.join(root, 'design/nested/plan.json'))).toBe(
      false,
    );

    fs.symlinkSync(elsewhere, path.join(root, 'design/linked-task'));
    expect(() =>
      resolveInside(root, 'design', 'design/linked-task/plan.json'),
    ).toThrow(/^design\/linked-task is a symlink/);

    // A file swapped for a link (an index pointing at source) is not written through.
    fs.mkdirSync(path.join(root, 'reports/design/notes-page'), {
      recursive: true,
    });
    fs.symlinkSync(
      path.join(root, 'src/globals/paths.ts'),
      path.join(root, 'reports/design/notes-page/index.html'),
    );
    expect(() => createRunDir(root, 'notes-page', 'run-1')).toThrow(
      'reports/design/notes-page/index.html is a symlink (to src/globals/paths.ts); design commands do not write through links. Make reports/design/notes-page/index.html a real file inside the project.',
    );
  });

  it('checks every planned destination before the first write', async () => {
    const { root, write, exists } = project();
    write('inbox/a.png', DESKTOP);
    write('inbox/b.png', DESKTOP);
    fs.mkdirSync(path.join(root, 'design/two/references'), { recursive: true });
    // The second copy's destination is a link; the first must not be written either.
    fs.symlinkSync(
      path.join(root, 'src/globals/paths.ts'),
      path.join(root, 'design/two/references/b.png'),
    );
    const result = await initTask({
      root,
      task: 'two',
      images: [path.join(root, 'inbox/a.png'), path.join(root, 'inbox/b.png')],
    });
    expect(result.ok).toBe(false);
    expect(exists('design/two/references/a.png')).toBe(false);
    expect(exists('design/two/plan.json')).toBe(false);
    expect(
      preflight(root, 'design', [
        'design/two/references/a.png',
        'design/two/references/b.png',
      ]),
    ).toEqual([
      'design/two/references/b.png is a symlink (to src/globals/paths.ts); design commands do not write through links. Make design/two/references/b.png a real file inside the project.',
    ]);
  });

  it('refuses baseline updates whose destination is linked, before Playwright starts', () => {
    const raw = withChanges(completePlan(), { 'captures.0.regression': true });
    const project = projectWithPlan(raw);
    dirs.push(project.root);
    fs.symlinkSync(
      path.join(project.root, 'src'),
      path.join(project.root, 'design/notes-page/baselines'),
    );
    const parsed = parsePlan(JSON.stringify(raw));
    if (!parsed.ok) throw new Error('fixture plan is invalid');
    /** @type {string[]} */
    const started = [];
    expect(() =>
      runScenarios({
        root: project.root,
        plans: [{ plan: parsed.plan, source: JSON.stringify(raw) }],
        mode: 'regression',
        update: true,
        spawn: (command) => {
          started.push(command);
          return { status: 0 };
        },
      }),
    ).toThrow(/^design\/notes-page\/baselines is a symlink \(to src\)/);
    expect(started).toEqual([]);
    expect(fs.existsSync(path.join(project.root, 'reports/design'))).toBe(
      false,
    );
  });

  it('refuses an update when a baseline it could remove is a link, before Playwright starts', () => {
    const raw = withChanges(completePlan(), {
      'captures.0.regression': true,
      'captures.0.extent': 'scroll',
    });
    const project = projectWithPlan(raw);
    dirs.push(project.root);
    const base = 'design/notes-page/baselines';
    project.write(
      `${base}/desktop-content-chromium-${process.platform}.png`,
      DESKTOP,
    );
    // A later scroll position, which the update may remove, is a link.
    fs.symlinkSync(
      path.join(project.root, 'src/globals/paths.ts'),
      path.join(
        project.root,
        `${base}/desktop-content--scroll-1-chromium-${process.platform}.png`,
      ),
    );
    const parsed = parsePlan(JSON.stringify(raw));
    if (!parsed.ok) throw new Error('fixture plan is invalid');
    /** @type {string[]} */
    const started = [];
    expect(() =>
      runScenarios({
        root: project.root,
        plans: [{ plan: parsed.plan, source: JSON.stringify(raw) }],
        mode: 'regression',
        update: true,
        spawn: (command) => {
          started.push(command);
          return { status: 0 };
        },
      }),
    ).toThrow(
      `${base}/desktop-content--scroll-1-chromium-${process.platform}.png is a symlink (to src/globals/paths.ts); design commands do not write through links.`,
    );
    expect(started).toEqual([]);
    expect(
      fs
        .lstatSync(
          path.join(
            project.root,
            `${base}/desktop-content--scroll-1-chromium-${process.platform}.png`,
          ),
        )
        .isSymbolicLink(),
    ).toBe(true);
  });
});

describe('supported arrangements', () => {
  it('writes into normal folders', async () => {
    const { root, write, exists } = project();
    write('inbox/a.png', DESKTOP);
    const result = await initTask({
      root,
      task: 'plain',
      images: [path.join(root, 'inbox/a.png')],
    });
    expect(result.ok).toBe(true);
    expect(exists('design/plain/references/a.png')).toBe(true);
    expect(createRunDir(root, 'plain', undefined).relative).toBe(
      'reports/design/plain/run-1',
    );
  });

  it('accepts a project reached through a link (the root is resolved first)', async () => {
    const { root, write } = project();
    const link = path.join(outside(), 'checkout');
    fs.symlinkSync(root, link);
    write('inbox/a.png', DESKTOP);
    const result = await initTask({
      root: link,
      task: 'linked-root',
      images: [path.join(root, 'inbox/a.png')],
    });
    expect(result.ok).toBe(true);
    expect(fs.existsSync(path.join(root, 'design/linked-root/plan.json'))).toBe(
      true,
    );
  });

  it('works in a git worktree', async () => {
    const { root, write } = project();
    const git = (/** @type {string[]} */ args, cwd = root) =>
      spawnSync(
        'git',
        ['-c', 'user.name=t', '-c', 'user.email=t@localhost', ...args],
        {
          cwd,
          encoding: 'utf8',
        },
      );
    git(['init', '--quiet']);
    git(['add', '--all']);
    git(['commit', '--quiet', '--no-verify', '-m', 'init']);
    const tree = path.join(outside(), 'tree');
    expect(git(['worktree', 'add', '--quiet', tree]).status).toBe(0);
    write('inbox/a.png', DESKTOP);
    const result = await initTask({
      root: tree,
      task: 'in-worktree',
      images: [path.join(root, 'inbox/a.png')],
    });
    expect(result.ok).toBe(true);
    expect(fs.existsSync(path.join(tree, 'design/in-worktree/plan.json'))).toBe(
      true,
    );
    expect(createRunDir(tree, 'in-worktree', undefined).relative).toBe(
      'reports/design/in-worktree/run-1',
    );
  });
});
