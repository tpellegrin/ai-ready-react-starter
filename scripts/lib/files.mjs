// @ts-check
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

/** Generated or installed directories that never hold source. */
const SKIP_DIRS = new Set([
  '.git',
  'node_modules',
  'coverage',
  'reports',
  'storybook-static',
  'playwright-report',
  'test-results',
]);

/**
 * @param {string} root
 * @param {string} dir
 * @returns {string[]}
 */
const walk = (root, dir) =>
  fs
    .readdirSync(path.join(root, dir), { withFileTypes: true })
    .flatMap((entry) => {
      const relative = dir ? `${dir}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        return SKIP_DIRS.has(entry.name) || /^dist(?:-|$)/.test(entry.name)
          ? []
          : walk(root, relative);
      }
      return [relative];
    });

/**
 * The project's files, relative to `root`: git's view when `root` is a git
 * checkout (tracked plus untracked-but-not-ignored), otherwise a directory
 * walk that skips generated output. Projects copied without `.git` (a
 * downloaded archive, a temporary verification copy) work the same way.
 *
 * @param {string} root
 * @returns {string[]}
 */
export const listProjectFiles = (root) => {
  try {
    return execFileSync(
      'git',
      ['ls-files', '-z', '--cached', '--others', '--exclude-standard'],
      { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] },
    )
      .toString()
      .split('\0')
      .filter((file) => file && fs.existsSync(path.join(root, file)));
  } catch {
    return walk(root, '');
  }
};
