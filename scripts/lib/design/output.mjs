// @ts-check
/**
 * Where design commands may write, checked before the first write.
 *
 * - `pnpm design init` writes only inside design/<task>/ (the plan and
 *   copies of reference images), never over an existing file.
 * - Capture and regression runs write evidence only inside
 *   reports/design/, each run into a new folder (an existing run is never
 *   replaced or cleaned).
 * - Nothing is written through a symlink that leads elsewhere (for example
 *   a reports/ link into src/).
 */
import fs from 'node:fs';
import path from 'node:path';

/**
 * Resolves `relative` (project-relative, POSIX) to an absolute path that is
 * really inside `base` (also project-relative), following symlinks of the
 * parts that exist. Throws an Error naming the problem otherwise.
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
  // The deepest part that exists decides where the write really lands.
  let existing = target;
  /** @type {string[]} */
  const rest = [];
  while (!fs.existsSync(existing)) {
    rest.unshift(path.basename(existing));
    existing = path.dirname(existing);
  }
  const real = path.join(fs.realpathSync(existing), ...rest);
  const realAllowed = fs.existsSync(allowed)
    ? fs.realpathSync(allowed)
    : allowed;
  if (real !== realAllowed && !real.startsWith(`${realAllowed}${path.sep}`)) {
    throw new Error(
      `${relative} resolves to ${path.relative(realRoot, real) || real} through a symlink, outside ${base}/`,
    );
  }
  return target;
};

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
    fs.writeFileSync(target, content, { flag: 'wx' });
  } catch (error) {
    if (/** @type {NodeJS.ErrnoException} */ (error).code === 'EEXIST') {
      throw new Error(`${relative} already exists; it was left as it is.`);
    }
    throw error;
  }
  return target;
};
