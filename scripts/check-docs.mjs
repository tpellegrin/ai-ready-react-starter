#!/usr/bin/env node
// @ts-check
/**
 * Keeps agent-facing instructions true (`pnpm docs:check`, part of
 * `pnpm validate`), in the starter and after adoption removed code:
 *
 * - Markdown links (and #anchors into Markdown files) resolve; CLAUDE.md's
 *   `@file` imports exist.
 * - Repository paths written as code (`src/features/<name>` is a pattern,
 *   `src/api/client.ts` a path) exist, in the instruction docs: AGENTS.md,
 *   README.md, docs/ (except history: decisions/ and migration notes, and
 *   adoption.md, which describes what adoption removes) and src/ READMEs.
 * - Every `pnpm <script>` they mention is a package.json script or a pnpm
 *   command.
 * - The `pnpm verify` steps (scripts/lib/verify-steps.mjs) and the CI
 *   workflow run the same scripts.
 *
 * Limits: it checks references, not whether prose is right; reviewers still
 * read the docs.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { listProjectFiles } from './lib/files.mjs';
import { steps } from './lib/verify-steps.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const files = listProjectFiles(root);
const markdown = files.filter((file) => file.endsWith('.md'));
const HISTORY = [/^docs\/decisions\//, /^docs\/migration-notes\.md$/];
const DESCRIBES_REMOVED = [/^docs\/adoption\.md$/];
const isInstruction = (/** @type {string} */ file) =>
  (file === 'AGENTS.md' ||
    file === 'README.md' ||
    file === 'CLAUDE.md' ||
    /^docs\/.*\.md$/.test(file) ||
    /^src\/.*README\.md$/.test(file)) &&
  ![...HISTORY, ...DESCRIBES_REMOVED].some((p) => p.test(file));

const PNPM_COMMANDS = new Set([
  'add',
  'audit',
  'bin',
  'config',
  'create',
  'dlx',
  'env',
  'exec',
  'i',
  'import',
  'init',
  'install',
  'link',
  'list',
  'outdated',
  'pack',
  'patch',
  'prune',
  'publish',
  'rebuild',
  'remove',
  'root',
  'run',
  'store',
  'up',
  'update',
  'why',
]);
/** @param {string} file @returns {unknown} */
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const pkg = /** @type {{ scripts: Record<string, string> }} */ (
  readJson(path.join(root, 'package.json'))
);

/** GitHub's heading anchors. @param {string} heading */
const slug = (heading) =>
  heading
    .trim()
    .toLowerCase()
    .replace(/`/g, '')
    .replace(/[^\p{L}\p{N}\s_-]/gu, '')
    .replace(/\s/g, '-');

/** @type {Map<string, Set<string>>} */
const anchorCache = new Map();
/** @param {string} file */
const anchorsOf = (file) => {
  const cached = anchorCache.get(file);
  if (cached) return cached;
  /** @type {Set<string>} */
  const anchors = new Set();
  /** @type {Map<string, number>} */
  const counts = new Map();
  let inFence = false;
  for (const line of fs
    .readFileSync(path.join(root, file), 'utf8')
    .split('\n')) {
    if (/^\s*(```|~~~)/.test(line)) inFence = !inFence;
    const heading = !inFence && /^#{1,6}\s+(.*?)\s*#*\s*$/.exec(line);
    if (!heading) continue;
    const base = slug(heading[1] ?? '');
    const seen = counts.get(base) ?? 0;
    counts.set(base, seen + 1);
    anchors.add(seen ? `${base}-${seen}` : base);
  }
  anchorCache.set(file, anchors);
  return anchors;
};

const exists = (/** @type {string} */ file) =>
  fs.existsSync(path.join(root, file));

/** @type {string[]} */
const problems = [];
/** @param {string} file @param {number} line @param {string} message */
const report = (file, line, message) =>
  problems.push(`✗ ${file}:${line} ${message}`);

const PATH_LIKE =
  /^(?:src|docs|scripts|e2e|eslint|\.github|\.storybook|\.husky)\/[\w./@-]*$/;

for (const file of markdown) {
  const lines = fs.readFileSync(path.join(root, file), 'utf8').split('\n');
  const dir = path.dirname(file);
  let inFence = false;
  lines.forEach((text, index) => {
    const line = index + 1;
    if (/^\s*(```|~~~)/.test(text)) {
      inFence = !inFence;
      return;
    }

    if (file === 'CLAUDE.md') {
      for (const [, target = ''] of text.matchAll(/^@(\S+)$/g)) {
        if (!exists(target))
          report(file, line, `imports missing file ${target}`);
      }
    }

    if (!inFence) {
      for (const [, target = ''] of text.matchAll(
        /\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g,
      )) {
        if (/^(?:[a-z]+:|\/\/)/i.test(target)) continue;
        const [targetPath = '', anchor] = target.split('#');
        const resolved = targetPath
          ? path.normalize(path.join(dir, decodeURIComponent(targetPath)))
          : file;
        if (!exists(resolved)) {
          report(file, line, `links to missing ${resolved}`);
        } else if (
          anchor &&
          resolved.endsWith('.md') &&
          !anchorsOf(resolved).has(anchor)
        ) {
          report(
            file,
            line,
            `links to missing heading #${anchor} in ${resolved}`,
          );
        }
      }
    }

    if (!isInstruction(file)) return;
    const spans = inFence
      ? [text]
      : [...text.matchAll(/`([^`]+)`/g)].map((m) => m[1] ?? '');
    for (const span of spans) {
      for (const [, script = ''] of span.matchAll(/\bpnpm\s+([a-z][\w:-]*)/g)) {
        if (!(script in pkg.scripts) && !PNPM_COMMANDS.has(script)) {
          report(
            file,
            line,
            `mentions \`pnpm ${script}\`, which is not a package.json script`,
          );
        }
      }
      if (inFence) continue;
      const candidate = span.trim().replace(/:\d+$/, '').replace(/#.*$/, '');
      if (!PATH_LIKE.test(candidate) || /[<>*{}$…]|\.\.\./.test(span)) continue;
      if (!exists(candidate.replace(/\/$/, ''))) {
        report(
          file,
          line,
          `refers to \`${candidate}\`, which does not exist (update the path or the doc)`,
        );
      }
    }
  });
}

// pnpm verify ↔ CI.
const ci = fs.readFileSync(path.join(root, '.github/workflows/ci.yml'), 'utf8');
const ciScripts = new Set(
  [...ci.matchAll(/run:\s+pnpm\s+([a-z][\w:-]*)/g)].map((m) => m[1] ?? ''),
);
ciScripts.delete('install');
ciScripts.delete('exec');
// `pnpm validate` is the validate group of the same runner.
const coveredByValidate = (/** @type {{ group?: string }} */ step) =>
  step.group === 'validate' && ciScripts.has('validate');
for (const step of steps) {
  if (!ciScripts.has(step.script) && !coveredByValidate(step)) {
    report(
      'scripts/lib/verify-steps.mjs',
      1,
      `verify step "${step.id}" runs \`pnpm ${step.script}\`, which CI (.github/workflows/ci.yml) never runs`,
    );
  }
}
for (const script of ciScripts) {
  if (script === 'validate') continue;
  if (!steps.some((step) => step.script === script)) {
    report(
      '.github/workflows/ci.yml',
      1,
      `CI runs \`pnpm ${script}\`, which pnpm verify (scripts/lib/verify-steps.mjs) does not`,
    );
  }
}

if (problems.length) {
  for (const problem of problems) console.error(problem);
  console.error(`\n[docs:check] ${problems.length} problem(s).`);
  process.exit(1);
}
console.log(`[docs:check] OK (${markdown.length} Markdown files)`);
