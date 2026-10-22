// @ts-check
/**
 * Applies product code on top of generated code in an adopted copy, the way
 * a team continues after `pnpm gen` (used by `pnpm adopt:check --scenario
 * design`). Everything is validated before the first write, and each
 * assumption about the generated code is checked, so a change to a
 * template or generator fails here, visibly, instead of being overwritten:
 *
 * - `files/` adds new files; a file that already exists must be listed in
 *   `replace` with the sha256 of the generated content it replaces;
 * - `remove` deletes generated files that no longer apply, also only when
 *   their sha256 matches;
 * - `insert` adds lines above a `starter:gen` marker (generated wiring such
 *   as a feature's exports stays generated);
 * - `copy/<locale>.json` adds translations; a key that exists is refused,
 *   unless `copyReplace` names it with the placeholder text the generator
 *   wrote, which must still be there in every locale;
 * - `lazyModules` are added to LAZY_MODULES.production in
 *   scripts/check-build.mjs (the view generator's next step).
 *
 * Shape of overlay.json:
 *   { generate: string[][], replace: { [path]: sha256 }, remove: { [path]: sha256 },
 *     insert: [{ file, marker, lines }], copyReplace: { [dotted key]: text },
 *     lazyModules: string[] }
 */
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { copyConflicts, listFiles, mergeCopy } from './generator.mjs';

/**
 * @typedef {{
 *   generate?: string[][],
 *   replace?: Record<string, string>,
 *   remove?: Record<string, string>,
 *   insert?: Array<{ file: string, marker: string, lines: string[] }>,
 *   copyReplace?: Record<string, string>,
 *   lazyModules?: string[],
 * }} Overlay
 */

/** @param {Buffer | string} content */
export const sha256 = (content) =>
  createHash('sha256').update(content).digest('hex');

/** @param {string} file @returns {unknown} */
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));

/** @param {Record<string, unknown>} object @param {string} key dotted */
const getPath = (object, key) =>
  key
    .split('.')
    .reduce(
      (/** @type {unknown} */ node, part) =>
        node && typeof node === 'object'
          ? /** @type {Record<string, unknown>} */ (node)[part]
          : undefined,
      object,
    );

/** @param {Record<string, unknown>} object @param {string} key dotted */
const deletePath = (object, key) => {
  const parts = key.split('.');
  const last = parts.pop() ?? '';
  const parent = /** @type {Record<string, unknown> | undefined} */ (
    getPath(object, parts.join('.'))
  );
  if (parent) delete parent[last];
};

/**
 * Plans the overlay against the copy at `root`; returns the problems found
 * (nothing is written) and, when there are none, a function that writes.
 * @param {{ root: string, overlayDir: string, overlay: Overlay }} input
 */
export const planOverlay = ({ root, overlayDir, overlay }) => {
  /** @type {string[]} */
  const problems = [];
  const abs = (/** @type {string} */ file) => path.join(root, file);
  const filesDir = path.join(overlayDir, 'files');
  const files = fs.existsSync(filesDir)
    ? listFiles(filesDir).map((file) =>
        path.relative(filesDir, file).split(path.sep).join('/'),
      )
    : [];
  const replace = overlay.replace ?? {};
  const remove = overlay.remove ?? {};

  const changed = (/** @type {string} */ file, /** @type {string} */ hash) =>
    `${file} is not the generated file this overlay was written against (sha256 ${hash.slice(0, 12)}…, now ${sha256(fs.readFileSync(abs(file))).slice(0, 12)}…). A template or generator changed: compare the overlay's version with the new generated one, then update its hash in overlay.json.`;

  for (const file of files) {
    const exists = fs.existsSync(abs(file));
    const hash = replace[file];
    if (exists && !hash) {
      problems.push(
        `${file} exists and the overlay does not declare that it replaces it (overlay.json "replace").`,
      );
    } else if (!exists && hash) {
      problems.push(
        `${file} is declared as replacing a generated file, but nothing generated it.`,
      );
    } else if (exists && hash && sha256(fs.readFileSync(abs(file))) !== hash) {
      problems.push(changed(file, hash));
    }
  }
  for (const file of Object.keys(replace)) {
    if (!files.includes(file)) {
      problems.push(
        `overlay.json replaces ${file}, but files/${file} does not exist.`,
      );
    }
  }
  for (const [file, hash] of Object.entries(remove)) {
    if (!fs.existsSync(abs(file))) {
      problems.push(`${file} should be removed, but nothing generated it.`);
    } else if (sha256(fs.readFileSync(abs(file))) !== hash) {
      problems.push(changed(file, hash));
    }
  }

  /** @type {Map<string, string>} */
  const edited = new Map();
  for (const { file, marker, lines } of overlay.insert ?? []) {
    const current =
      edited.get(file) ??
      (fs.existsSync(abs(file)) ? fs.readFileSync(abs(file), 'utf8') : null);
    const rows = current?.split('\n') ?? [];
    const index = rows.findIndex((row) => row.includes(marker));
    if (current === null || index === -1) {
      problems.push(`${file}: marker "${marker}" not found.`);
      continue;
    }
    const indent = /^\s*/.exec(rows[index] ?? '')?.[0] ?? '';
    rows.splice(index, 0, ...lines.map((line) => `${indent}${line}`));
    edited.set(file, rows.join('\n'));
  }

  const localesDir = abs('src/i18n/locales');
  /** @type {Map<string, Record<string, unknown>>} */
  const locales = new Map();
  const copyDir = path.join(overlayDir, 'copy');
  if (fs.existsSync(copyDir)) {
    for (const name of fs.readdirSync(copyDir).sort()) {
      const target = path.join(localesDir, name);
      if (!fs.existsSync(target)) {
        problems.push(`copy/${name} has no locale src/i18n/locales/${name}.`);
        continue;
      }
      const locale = /** @type {Record<string, unknown>} */ (readJson(target));
      const copy = /** @type {Record<string, unknown>} */ (
        readJson(path.join(copyDir, name))
      );
      for (const [key, expected] of Object.entries(overlay.copyReplace ?? {})) {
        const current = getPath(locale, key);
        if (typeof getPath(copy, key) !== 'string') {
          problems.push(
            `copy/${name} replaces "${key}" but gives no new text for it.`,
          );
        } else if (current !== expected) {
          problems.push(
            `${name}: "${key}" is ${JSON.stringify(current)}, not the generated placeholder ${JSON.stringify(expected)} the overlay replaces.`,
          );
        } else {
          deletePath(locale, key);
        }
      }
      // Keys named in copyReplace were checked above.
      const added = /** @type {Record<string, unknown>} */ (
        structuredClone(copy)
      );
      for (const key of Object.keys(overlay.copyReplace ?? {})) {
        deletePath(added, key);
      }
      problems.push(
        ...copyConflicts(locale, added).map(
          (conflict) => `${name}: ${conflict}`,
        ),
      );
      mergeCopy(locale, copy);
      locales.set(target, locale);
    }
  }

  const checkBuild = abs('scripts/check-build.mjs');
  let lazy = null;
  if (overlay.lazyModules?.length) {
    const source = fs.readFileSync(checkBuild, 'utf8');
    lazy = source.replace(
      /(const LAZY_MODULES = \{\s*production: \[)/,
      `$1${overlay.lazyModules.map((m) => `'${m}', `).join('')}`,
    );
    if (lazy === source) {
      problems.push(
        'scripts/check-build.mjs: LAZY_MODULES.production not found.',
      );
    }
  }

  const write = () => {
    for (const file of Object.keys(remove)) fs.rmSync(abs(file));
    for (const file of files) {
      fs.mkdirSync(path.dirname(abs(file)), { recursive: true });
      fs.copyFileSync(path.join(filesDir, file), abs(file));
    }
    for (const [file, text] of edited) fs.writeFileSync(abs(file), text);
    for (const [file, locale] of locales) {
      fs.writeFileSync(file, `${JSON.stringify(locale, null, 2)}\n`);
    }
    if (lazy !== null) fs.writeFileSync(checkBuild, lazy);
    return {
      written: [
        ...files,
        ...edited.keys(),
        ...[...locales.keys()].map((file) => path.relative(root, file)),
        ...(lazy !== null ? ['scripts/check-build.mjs'] : []),
      ],
      removed: Object.keys(remove),
    };
  };
  return { problems, write: problems.length ? null : write };
};
