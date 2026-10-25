// @ts-check
/**
 * Where design commands may write, checked before the first write.
 *
 * - `pnpm design init` writes only inside design/<task>/ (the plan and
 *   copies of reference images), never over an existing file.
 * - Capture and regression runs write evidence only inside
 *   reports/design/, each run into a new folder (an existing run is never
 *   replaced or cleaned); `pnpm design regress --update` writes baselines
 *   only into design/<task>/baselines/, and removes only baselines there
 *   that the scenario it updated no longer produces.
 * - Writes never follow a symlink: no part of the path below the project
 *   root (the base folder, its parents, task folders, the file itself) may
 *   be one, so a link cannot redirect a write into src/, elsewhere in the
 *   project or outside it. The project root itself may be reached through
 *   links (it is resolved first), so worktrees and linked checkouts work.
 *
 * These are checks made before writing; they do not guard against the
 * file system changing concurrently while a command runs.
 */
import fs from 'node:fs';
import path from 'node:path';

/**
 * Resolves `relative` (project-relative, POSIX) to an absolute path inside
 * `base` (also project-relative) that no symlink redirects. Throws an Error
 * naming the problem otherwise.
 * @param {string} root
 * @param {string} base
 * @param {string} relative
 */
export const resolveInside = (root, base, relative) => {
  if (path.isAbsolute(relative) || relative.split(/[\\/]/).includes('..')) {
    throw new Error(
      `${relative}: only relative paths without ".." are written`,
    );
  }
  const realRoot = fs.realpathSync(root);
  const allowed = path.join(realRoot, base);
  const target = path.join(realRoot, relative);
  if (!target.startsWith(`${allowed}${path.sep}`)) {
    throw new Error(`${relative} is outside ${base}/`);
  }
  let current = realRoot;
  for (const part of path.relative(realRoot, target).split(path.sep)) {
    current = path.join(current, part);
    const stat = fs.lstatSync(current, { throwIfNoEntry: false });
    if (!stat) break;
    if (stat.isSymbolicLink()) {
      const link = path.relative(realRoot, current);
      /** @type {string} */
      let points;
      try {
        points = fs.realpathSync(current);
      } catch {
        // A dangling link: show where it says it goes.
        points = path.resolve(path.dirname(current), fs.readlinkSync(current));
      }
      const shown = points.startsWith(`${realRoot}${path.sep}`)
        ? path.relative(realRoot, points)
        : points;
      throw new Error(
        `${link} is a symlink (to ${shown}); design commands do not write through links. Make ${link} a real ${fs.statSync(current, { throwIfNoEntry: false })?.isFile() ? 'file' : 'folder'} inside the project.`,
      );
    }
  }
  return target;
};

/**
 * Checks every destination a command will write before it writes the
 * first: each must resolve inside `base` without links and, unless
 * `replace` allows it, must not exist yet. Returns the problems.
 * @param {string} root
 * @param {string} base
 * @param {string[]} destinations  project-relative
 * @param {{ replace?: boolean }} [options]
 */
export const preflight = (root, base, destinations, { replace = false } = {}) =>
  destinations.flatMap((relative) => {
    try {
      const target = resolveInside(root, base, relative);
      return !replace && fs.existsSync(target)
        ? [`${relative} already exists; it was left as it is.`]
        : [];
    } catch (error) {
      return [error instanceof Error ? error.message : String(error)];
    }
  });

/**
 * Creates a new, empty run folder under reports/design (never reusing one).
 * Without a label the next free `run-<n>` is used.
 * @param {string} root
 * @param {string} scope  task name, or `_regression`
 * @param {string | undefined} label
 * @returns {{ dir: string, label: string, relative: string }}
 */
export const createRunDir = (root, scope, label) => {
  const base = 'reports/design';
  const parent = `${base}/${scope}`;
  // Checked before listing it: a linked parent is refused, not read.
  resolveInside(root, base, `${parent}/index.html`);
  let chosen = label;
  if (!chosen) {
    const existing = fs.existsSync(path.join(root, parent))
      ? fs.readdirSync(path.join(root, parent))
      : [];
    let n = 1;
    while (existing.includes(`run-${n}`)) n += 1;
    chosen = `run-${n}`;
  }
  const relative = `${parent}/${chosen}`;
  const dir = resolveInside(root, base, relative);
  if (fs.existsSync(dir)) {
    throw new Error(
      `${relative} already exists: evidence runs are never overwritten. Choose another --label.`,
    );
  }
  fs.mkdirSync(dir, { recursive: true });
  return { dir, label: chosen, relative };
};

/**
 * Writes a new file inside `base` (project-relative); refuses to replace one.
 * @param {string} root
 * @param {string} base
 * @param {string} relative
 * @param {string | Buffer} content
 */
export const writeNewFile = (root, base, relative, content) => {
  const target = resolveInside(root, base, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  try {
    // `wx` also refuses a symlink created at the path since the check.
    fs.writeFileSync(target, content, { flag: 'wx' });
  } catch (error) {
    if (/** @type {NodeJS.ErrnoException} */ (error).code === 'EEXIST') {
      throw new Error(`${relative} already exists; it was left as it is.`);
    }
    throw error;
  }
  return target;
};

/**
 * Removes a file the command owns (a baseline no longer produced) inside
 * `base`, never through a link and never a folder.
 * @param {string} root
 * @param {string} base
 * @param {string} relative
 */
export const removeOwnedFile = (root, base, relative) => {
  const target = resolveInside(root, base, relative);
  if (!fs.lstatSync(target).isFile()) {
    throw new Error(`${relative} is not a file; it was left as it is.`);
  }
  fs.rmSync(target);
};

/**
 * Replaces a file the command owns (an index regenerated from runs) inside
 * `base`, never through a link.
 * @param {string} root
 * @param {string} base
 * @param {string} relative
 * @param {string} content
 */
export const writeOwnedFile = (root, base, relative, content) => {
  const target = resolveInside(root, base, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
  return target;
};
