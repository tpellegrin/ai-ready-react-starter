// @ts-check
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { listProjectFiles } from './files.mjs';

/** Tool caches that must not be shared with the real checkout. */
const PRIVATE_NODE_MODULES = new Set(['.cache', '.tmp', '.vite', '.vite-temp']);

/**
 * Copies the project (tracked and untracked-but-not-ignored files, or every
 * source file when it is not a git checkout) into a temporary directory.
 * node_modules is a real directory of symlinks to the checkout's packages,
 * so installs are reused while tool caches (tsc build info, Vite, Vitest)
 * stay private to the copy. Never install packages inside a workspace: the
 * symlinks point at the checkout.
 *
 * With `git: true` the copy becomes a one-commit git repository, like a fresh
 * clone of the starter (adoption reads git and records the revision).
 *
 * @param {string} projectRoot
 * @param {string} prefix
 * @param {{ git?: boolean }} [options]
 */
export const createWorkspace = (projectRoot, prefix, { git = false } = {}) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  for (const file of listProjectFiles(projectRoot)) {
    const target = path.join(dir, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.cpSync(path.join(projectRoot, file), target);
  }

  const modules = path.join(dir, 'node_modules');
  fs.mkdirSync(modules);
  // A workspace created inside another workspace links to the same real
  // packages (node_modules entries there are symlinks already).
  for (const entry of fs.readdirSync(path.join(projectRoot, 'node_modules'))) {
    if (PRIVATE_NODE_MODULES.has(entry)) continue;
    fs.symlinkSync(
      fs.realpathSync(path.join(projectRoot, 'node_modules', entry)),
      path.join(modules, entry),
    );
  }

  if (git) {
    const identity = [
      '-c',
      'user.name=starter',
      '-c',
      'user.email=starter@localhost',
    ];
    for (const args of [
      ['init', '--quiet'],
      ['add', '--all'],
      [
        ...identity,
        'commit',
        '--quiet',
        '--no-verify',
        '-m',
        'chore: starter copy',
      ],
    ]) {
      const result = spawnSync('git', args, { cwd: dir, encoding: 'utf8' });
      if (result.status !== 0) {
        throw new Error(`git ${args.join(' ')} failed: ${result.stderr}`);
      }
    }
  }

  /**
   * Runs a command inside the copy. Returns its exit status and output.
   * @param {string} command
   * @param {string[]} args
   * @param {{ quiet?: boolean, env?: Record<string, string> }} [options]
   */
  const run = (command, args, { quiet = false, env = {} } = {}) => {
    const bin = path.join(dir, 'node_modules/.bin', command);
    const executable = fs.existsSync(bin) ? bin : command;
    const result = spawnSync(executable, args, {
      cwd: dir,
      encoding: 'utf8',
      env: { ...process.env, CI: 'true', FORCE_COLOR: '0', ...env },
    });
    const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
    if (!quiet && output.trim()) process.stdout.write(indent(output));
    return { status: result.status ?? 1, output };
  };

  /** Lists every file under `relative` (minus .git and node_modules) with its size and mtime. */
  const snapshot = (relative = 'src') =>
    listFiles(path.join(dir, relative))
      .map((file) => {
        const stat = fs.statSync(file);
        return `${path.relative(dir, file)}:${stat.size}:${stat.mtimeMs}`;
      })
      .sort()
      .join('\n');

  const cleanup = () => fs.rmSync(dir, { recursive: true, force: true });

  return { dir, run, snapshot, cleanup };
};

/** @param {string} dir @returns {string[]} */
const listFiles = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === '.git' || entry.name === 'node_modules') return [];
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? listFiles(full) : [full];
  });

/** @param {string} text */
const indent = (text) =>
  text
    .trimEnd()
    .split('\n')
    .map((line) => `    ${line}`)
    .join('\n')
    .concat('\n');

/**
 * Minimal step runner for verification scripts: prints each step and
 * collects failures instead of stopping at the first one.
 * @param {string} label
 */
export const createReport = (label) => {
  /** @type {string[]} */
  const failures = [];
  return {
    /** @param {string} name @param {boolean} ok @param {string} [detail] */
    step(name, ok, detail) {
      console.log(`${ok ? '✓' : '✗'} ${name}`);
      if (!ok) failures.push(detail ? `${name}: ${detail}` : name);
    },
    finish() {
      if (failures.length) {
        console.error(`\n[${label}] FAILED (${failures.length}):`);
        for (const failure of failures) console.error(`  ✗ ${failure}`);
        process.exit(1);
      }
      console.log(`\n[${label}] OK`);
    },
  };
};
