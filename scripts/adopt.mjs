#!/usr/bin/env node
// @ts-check
/**
 * Turns the starter into your project by removing starter-only code.
 *
 *   pnpm adopt --remove-demo [--remove-reference] [--dry-run]
 *
 * --remove-demo       DemoHub, demo auth, public onboarding preview, the demo
 *                     build and its GitHub Pages workflow.
 * --remove-reference  The Resource reference feature (keep it until your
 *                     first real feature follows its patterns).
 * --dry-run           Print every change without writing anything.
 *
 * Every run also removes the groups without a flag (`maintenance`: the
 * adoption check's verify step and CI job, which only the starter passes).
 *
 * What each group removes is declared in starter.manifest.json (files,
 * package scripts, i18n keys) and in marker regions inside files:
 *
 *   // starter:demo-start          lines removed with the group...
 *   // starter:demo-else           ...optionally followed by commented-out
 *   // replacement();              lines that are uncommented instead
 *   // starter:demo-end
 *
 * (`#` comments work the same in YAML/.env files; JSX uses
 * `{/* starter:reference-start *\/}` without an else branch.)
 *
 * Every marker is validated before the first write. Run `pnpm validate`
 * afterwards; `pnpm adopt:check` proves the result in a temporary copy.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { listProjectFiles } from './lib/files.mjs';

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
const manifestPath = path.join(projectRoot, 'starter.manifest.json');
const localesDir = path.join(projectRoot, 'src/i18n/locales');
const TEXT_FILE =
  /\.(?:[cm]?[jt]sx?|json|ya?ml|html|css)$|(?:^|\/)\.env(?:\.[\w.-]+)?$/;

/** @param {string} message @returns {never} */
const exit = (message) => {
  console.error(`[adopt] ${message}`);
  process.exit(1);
};

/**
 * @typedef {{ flag?: string, description: string, delete: string[], packageScripts: string[], i18nKeys: string[] }} Group
 * @typedef {{ starter: Record<string, string>, groups: Record<string, Group>, adoption: unknown }} Manifest
 */
/** @param {string} file @returns {unknown} */
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const manifest = /** @type {Manifest} */ (readJson(manifestPath));

const { values } = parseArgs({
  options: {
    'remove-demo': { type: 'boolean', default: false },
    'remove-reference': { type: 'boolean', default: false },
    'dry-run': { type: 'boolean', default: false },
    help: { type: 'boolean', default: false },
  },
});
const groups = [
  ...(values['remove-demo'] ? ['demo'] : []),
  ...(values['remove-reference'] ? ['reference'] : []),
];
if (values.help || !groups.length) {
  console.log(
    'Usage: pnpm adopt --remove-demo [--remove-reference] [--dry-run]\n',
  );
  for (const group of Object.values(manifest.groups)) {
    console.log(
      `  ${(group.flag ?? '(always)').padEnd(20)} ${group.description}`,
    );
  }
  process.exit(values.help ? 0 : 1);
}
const dryRun = values['dry-run'];
/** The chosen groups plus those every adoption removes (no flag). */
const removing = [
  ...groups,
  ...Object.keys(manifest.groups).filter(
    (name) => !manifest.groups[name]?.flag,
  ),
];

// --- Collect files ------------------------------------------------------
const trackedFiles = listProjectFiles(projectRoot);

const deletions = removing.flatMap(
  (name) => manifest.groups[name]?.delete ?? [],
);
const isDeleted = (/** @type {string} */ file) =>
  deletions.some((target) => file === target || file.startsWith(`${target}/`));

// --- Plan marker edits (validate everything before writing) -------------
const MARKER = /starter:([a-z]+)-(start|else|end)\b/;
/**
 * In Markdown only whole-line HTML comments are markers
 * (`<!-- starter:reference-start -->` … `<!-- starter:reference-end -->`,
 * no else branch), so docs can show the code markers as examples.
 */
const MARKDOWN_MARKER = /^\s*<!--\s*starter:([a-z]+)-(start|end)\s*-->\s*$/;

/**
 * @param {string} file
 * @param {string} text
 * @param {RegExp} marker
 * @returns {{ text: string, regions: number }}
 */
const applyMarkers = (file, text, marker) => {
  const lines = text.split('\n');
  /** @type {string[]} */
  const output = [];
  /** @type {{ group: string, line: number, phase: 'start' | 'else', prefix: string, remove: boolean } | null} */
  let open = null;
  let regions = 0;

  lines.forEach((line, index) => {
    const match = marker.exec(line);
    const where = `${file}:${index + 1}`;
    if (match) {
      const [, group = '', phase] = match;
      if (!manifest.groups[group])
        exit(`${where}: unknown marker group "${group}".`);
      const prefix = /^\s*(\/\/|#)/.exec(line)?.[1] ?? '';
      if (phase === 'start') {
        if (open)
          exit(
            `${where}: nested marker inside the region opened at line ${open.line}.`,
          );
        open = {
          group,
          line: index + 1,
          phase: 'start',
          prefix,
          remove: removing.includes(group),
        };
        if (!open.remove) output.push(line);
        return;
      }
      if (!open || open.group !== group)
        exit(`${where}: "${phase}" marker without a matching start.`);
      if (phase === 'else') {
        if (!open.prefix)
          exit(`${where}: else branches need // or # comments.`);
        open.phase = 'else';
        if (!open.remove) output.push(line);
        return;
      }
      if (open.remove) regions += 1;
      else output.push(line);
      open = null;
      return;
    }
    if (!open || !open.remove) {
      output.push(line);
    } else if (open.phase === 'else') {
      const uncommented = new RegExp(
        `^(\\s*)${open.prefix === '#' ? '#' : '//'} ?`,
      ).exec(line);
      if (!uncommented)
        exit(
          `${where}: else-branch lines must be commented with "${open.prefix}".`,
        );
      output.push(line.replace(uncommented[0], uncommented[1] ?? ''));
    }
  });
  if (open)
    exit(
      `${file}: region opened at line ${/** @type {{ line: number }} */ (open).line} is never closed.`,
    );
  return { text: output.join('\n'), regions };
};

/** @type {Array<{ file: string, text: string, regions: number }>} */
const edits = [];
for (const file of trackedFiles) {
  const markdown = file.endsWith('.md');
  if (
    isDeleted(file) ||
    (!markdown && !TEXT_FILE.test(file)) ||
    file === 'scripts/adopt.mjs'
  )
    continue;
  const text = fs.readFileSync(path.join(projectRoot, file), 'utf8');
  if (!text.includes('starter:')) continue;
  const result = applyMarkers(file, text, markdown ? MARKDOWN_MARKER : MARKER);
  if (result.regions) edits.push({ file, ...result });
}

// --- package.json scripts and i18n keys ----------------------------------
const packagePath = path.join(projectRoot, 'package.json');
const pkg = /** @type {{ scripts: Record<string, string> }} */ (
  readJson(packagePath)
);
const scripts = removing
  .flatMap((name) => manifest.groups[name]?.packageScripts ?? [])
  .filter((name) => name in pkg.scripts);
const i18nKeys = removing.flatMap(
  (name) => manifest.groups[name]?.i18nKeys ?? [],
);

/**
 * @param {Record<string, unknown>} object
 * @param {string} dotted
 */
const deleteKey = (object, dotted) => {
  const parts = dotted.split('.');
  const last = parts.pop() ?? '';
  /** @type {unknown} */
  let parent = object;
  for (const part of parts) {
    if (!parent || typeof parent !== 'object') return false;
    parent = /** @type {Record<string, unknown>} */ (parent)[part];
  }
  if (!parent || typeof parent !== 'object' || !(last in parent)) return false;
  delete (/** @type {Record<string, unknown>} */ (parent)[last]);
  return true;
};

// --- Provenance ---------------------------------------------------------
/**
 * @typedef {{ commit: string, uncommittedChanges: boolean } | null} Revision
 * @typedef {{ removed?: unknown, starterRevision?: Revision }} AdoptionRecord
 */
const previousAdoption = /** @type {AdoptionRecord} */ (
  manifest.adoption ?? {}
);
/** The commit this run starts from (null outside a git checkout). @returns {Revision} */
const readRevision = () => {
  /** @param {string[]} args */
  const git = (args) =>
    execFileSync('git', args, {
      cwd: projectRoot,
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim();
  try {
    return {
      commit: git(['rev-parse', 'HEAD']),
      uncommittedChanges: git(['status', '--porcelain']) !== '',
    };
  } catch {
    return null;
  }
};
// Recorded by the first adoption run only: later runs (e.g. removing the
// reference feature weeks later) happen on the product's own commits.
const starterRevision =
  previousAdoption.starterRevision !== undefined
    ? previousAdoption.starterRevision
    : readRevision();

// --- Report ------------------------------------------------------------
const rel = (/** @type {string} */ file) => file;
console.log(
  `[adopt] Removing: ${removing.join(', ')}${dryRun ? ' (dry run)' : ''}`,
);
console.log(
  `  record  starter.manifest.json › adoption (starter revision ${
    starterRevision
      ? `${starterRevision.commit}${starterRevision.uncommittedChanges ? ' + uncommitted changes' : ''}`
      : 'unknown: not a git checkout'
  })`,
);
for (const target of deletions) {
  if (fs.existsSync(path.join(projectRoot, target)))
    console.log(`  delete  ${rel(target)}`);
}
for (const edit of edits) {
  console.log(
    `  edit    ${edit.file} (${edit.regions} region${edit.regions > 1 ? 's' : ''})`,
  );
}
for (const name of scripts) console.log(`  script  package.json › ${name}`);
for (const key of i18nKeys) console.log(`  i18n    ${key}`);

if (dryRun) {
  console.log('[adopt] Dry run: nothing was written.');
  process.exit(0);
}

// --- Write --------------------------------------------------------------
for (const target of deletions) {
  fs.rmSync(path.join(projectRoot, target), { recursive: true, force: true });
}
for (const edit of edits) {
  fs.writeFileSync(path.join(projectRoot, edit.file), edit.text);
}
for (const name of scripts) delete pkg.scripts[name];
fs.writeFileSync(packagePath, `${JSON.stringify(pkg, null, 2)}\n`);

for (const file of fs.readdirSync(localesDir)) {
  if (!file.endsWith('.json') || file === 'pseudo.json') continue;
  const localePath = path.join(localesDir, file);
  const locale = /** @type {Record<string, unknown>} */ (readJson(localePath));
  for (const key of i18nKeys) deleteKey(locale, key);
  fs.writeFileSync(localePath, `${JSON.stringify(locale, null, 2)}\n`);
}

const previous = Array.isArray(previousAdoption.removed)
  ? /** @type {string[]} */ (previousAdoption.removed)
  : [];
manifest.adoption = {
  removed: [...new Set([...previous, ...groups])],
  date: new Date().toISOString().slice(0, 10),
  starterRevision,
};
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

/** @param {string} command @param {string[]} args */
const run = (command, args) => {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    stdio: 'inherit',
  });
  if (result.status !== 0) exit(`"${command} ${args.join(' ')}" failed.`);
};
run(process.execPath, [path.join(projectRoot, 'scripts/i18n-pseudo.mjs')]);
run(path.join(projectRoot, 'node_modules/.bin/prettier'), [
  '--write',
  '--log-level=warn',
  'package.json',
  'starter.manifest.json',
  'src/i18n/locales',
  ...edits
    .map((edit) => edit.file)
    .filter((file) => !/(?:^|\/)\.env/.test(file)),
]);

console.log(`[adopt] Done. Next steps:
  1. Run pnpm validate, then pnpm verify (what CI runs), to confirm everything passes.
  2. Wire your real auth (docs/recipes/real-auth-adapter.md) and API base URL.
  3. Review docs/adoption.md for the remaining replaceable pieces.`);
