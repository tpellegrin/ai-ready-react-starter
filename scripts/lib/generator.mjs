// @ts-check
/**
 * Shared core of `pnpm gen` (scripts/gen.mjs): every generator builds a
 * plan, the core validates all of it before the first write, then writes.
 *
 * - Files are only created, never overwritten (refused if they exist).
 * - Edits insert code at `starter:gen <name>` markers in the existing
 *   registries (paths.ts, route tables, mock handlers, navigation). A
 *   required marker that is missing stops the run; an optional one becomes
 *   a manual step in the report.
 * - Copy is merged into every locale (en-US text in each, to translate):
 *   new keys join existing groups, but an existing text is never replaced,
 *   turned into a group, or the reverse. The pseudo-locale is regenerated.
 * - Everything written is formatted with Prettier, so output is predictable.
 *
 * Dry runs and real runs share the same checks. They cover what the plan
 * can know before writing; a file system error during the writes can still
 * leave a partial result.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

/**
 * @typedef {{ path: string, content: string }} CreateFile
 * @typedef {{
 *   path: string,
 *   marker: string,
 *   insert: string,
 *   description: string,
 *   optional?: string,
 * }} Edit  `insert` goes on the lines above the marker line; `optional` is
 *          the manual step to report when the marker is missing.
 * @typedef {{
 *   title: string,
 *   creates: CreateFile[],
 *   edits: Edit[],
 *   copy: Record<string, unknown>,
 *   next: string[],
 * }} Plan
 */

/** @param {string} message @returns {never} */
export const fail = (message) => {
  console.error(`[gen] ${message}`);
  process.exit(1);
};

/** @param {string} value kebab-case → PascalCase */
export const toPascal = (value) =>
  value
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');

/** @param {string} value kebab-case or PascalCase → camelCase */
export const toCamel = (value) => {
  const pascal = toPascal(value);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
};

/** @param {string} value PascalCase → kebab-case */
export const toKebab = (value) =>
  value.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

export const KEBAB = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
export const PASCAL = /^[A-Z][a-z0-9]+(?:[A-Z][a-z0-9]*)*$/;

/**
 * Replaces `__token__` placeholders.
 * @param {string} text
 * @param {Record<string, string>} tokens
 */
export const fill = (text, tokens) =>
  Object.entries(tokens).reduce(
    (result, [token, value]) => result.split(token).join(value),
    text,
  );

/** @param {string} dir @returns {string[]} */
export const listFiles = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? listFiles(full) : [full];
  });

/**
 * Template folder → files to create (names and contents filled).
 * @param {string} templateDir
 * @param {string} targetDir  relative to the project root
 * @param {Record<string, string>} tokens
 * @param {(relative: string) => boolean} [include]
 */
export const fromTemplate = (templateDir, targetDir, tokens, include) =>
  listFiles(templateDir)
    .map((file) => path.relative(templateDir, file))
    .filter((relative) => relative !== 'messages.json')
    .filter((relative) => (include ? include(relative) : true))
    .map((relative) => ({
      path: path.join(targetDir, fill(relative, tokens)),
      content: fill(
        fs.readFileSync(path.join(templateDir, relative), 'utf8'),
        tokens,
      ),
    }));

/** @param {unknown} value @returns {value is Record<string, unknown>} */
const isGroup = (value) =>
  !!value && typeof value === 'object' && !Array.isArray(value);

/** @param {unknown} value @param {string} [prefix] @returns {string[]} */
const leafKeys = (value, prefix = '') =>
  isGroup(value)
    ? Object.entries(value).flatMap(([key, child]) =>
        leafKeys(child, prefix ? `${prefix}.${key}` : key),
      )
    : [prefix];

/** @param {string[]} keys */
const listKeys = (keys) =>
  keys.length > 3 ? `${keys.slice(0, 3).join(', ')}, …` : keys.join(', ');

/**
 * Where merging `copy` into `messages` would change an existing
 * translation instead of adding one: a text the plan would replace, a text
 * that would become a group, or a group that would become a text. New keys
 * inside existing groups are compatible and not reported.
 * @param {Record<string, unknown>} messages  a locale (or a group of it)
 * @param {Record<string, unknown>} copy  the plan's copy at the same level
 * @param {string} [prefix]
 * @returns {string[]} one explanation per conflicting key
 */
export const copyConflicts = (messages, copy, prefix = '') =>
  Object.entries(copy).flatMap(([key, value]) => {
    if (!Object.hasOwn(messages, key)) return [];
    const at = prefix ? `${prefix}.${key}` : key;
    const existing = messages[key];
    if (isGroup(existing) && isGroup(value)) {
      return copyConflicts(existing, value, at);
    }
    if (isGroup(value)) {
      return [
        `"${at}" is a text; the plan would turn it into a group (${listKeys(leafKeys(value, at))})`,
      ];
    }
    if (isGroup(existing)) {
      return [
        `"${at}" is a group (${listKeys(leafKeys(existing, at))}); the plan would replace it with a text`,
      ];
    }
    return [`"${at}" already exists; the plan would replace its text`];
  });

/** @param {Record<string, unknown>} target @param {Record<string, unknown>} source */
const merge = (target, source) => {
  for (const [key, value] of Object.entries(source)) {
    const existing = target[key];
    if (isGroup(value) && isGroup(existing)) {
      merge(existing, value);
    } else {
      target[key] = value;
    }
  }
};

/** @param {string} text @returns {unknown} */
const parseJson = (text) => JSON.parse(text);

/** @param {string} file */
const readJson = (file) =>
  /** @type {Record<string, unknown>} */ (
    parseJson(fs.readFileSync(file, 'utf8'))
  );

/**
 * Validates the whole plan, prints it, and (unless dry run) applies it.
 * @param {string} root
 * @param {Plan} plan
 * @param {{ dryRun: boolean }} options
 */
export const runPlan = (root, plan, { dryRun }) => {
  const abs = (/** @type {string} */ file) => path.join(root, file);
  const localesDir = abs('src/i18n/locales');
  const localeFiles = fs
    .readdirSync(localesDir)
    .filter((file) => file.endsWith('.json') && file !== 'pseudo.json')
    .map((file) => path.join(localesDir, file));

  // --- Validate everything first ---------------------------------------
  for (const file of plan.creates) {
    if (fs.existsSync(abs(file.path))) {
      fail(`${file.path} already exists. Nothing was changed.`);
    }
  }
  const newKeys = leafKeys(plan.copy);
  const conflicts = localeFiles.flatMap((file) =>
    copyConflicts(readJson(file), plan.copy).map(
      (conflict) => `  ${path.relative(root, file)}: ${conflict}`,
    ),
  );
  if (conflicts.length) {
    fail(
      [
        `${plan.title} cannot add its copy without changing existing translations:`,
        ...conflicts,
        'Generated copy only adds keys: replacing or reshaping one would break the screens that use it. Choose another name (the copy keys come from it). Nothing was changed.',
      ].join('\n'),
    );
  }
  /** @type {Map<string, string>} */
  const edited = new Map();
  /** @type {string[]} */
  const manual = [];
  /** @type {Edit[]} */
  const applied = [];
  for (const edit of plan.edits) {
    const current =
      edited.get(edit.path) ??
      (fs.existsSync(abs(edit.path))
        ? fs.readFileSync(abs(edit.path), 'utf8')
        : null);
    const lines = current?.split('\n') ?? [];
    const index = lines.findIndex((line) => line.includes(edit.marker));
    if (current === null || index === -1) {
      if (edit.optional) {
        manual.push(edit.optional);
        continue;
      }
      fail(
        `${edit.path}: marker "${edit.marker}" not found, so ${edit.description} cannot be automated. Restore the marker (see docs/recipes/README.md) and run again. Nothing was changed.`,
      );
    }
    const indent = /^\s*/.exec(lines[index] ?? '')?.[0] ?? '';
    const block = edit.insert
      .split('\n')
      .map((line) => (line ? `${indent}${line}` : line));
    lines.splice(index, 0, ...block);
    edited.set(edit.path, lines.join('\n'));
    applied.push(edit);
  }

  // --- Report -----------------------------------------------------------
  console.log(`[gen] ${plan.title}${dryRun ? ' — dry run' : ''}`);
  for (const file of plan.creates) console.log(`  create  ${file.path}`);
  for (const edit of applied) {
    console.log(`  update  ${edit.path} (${edit.description})`);
  }
  if (newKeys.length) {
    console.log(
      `  copy    ${newKeys.join(', ')} in ${localeFiles.length} locales (+ pseudo regenerated)`,
    );
  }
  for (const step of manual) console.log(`  manual  ${step}`);
  if (dryRun) {
    console.log('[gen] Dry run: nothing was written.');
    return;
  }

  // --- Write --------------------------------------------------------------
  for (const file of plan.creates) {
    fs.mkdirSync(path.dirname(abs(file.path)), { recursive: true });
    fs.writeFileSync(abs(file.path), file.content, { flag: 'wx' });
  }
  for (const [file, text] of edited) fs.writeFileSync(abs(file), text);
  if (newKeys.length) {
    for (const file of localeFiles) {
      const locale = readJson(file);
      merge(locale, structuredClone(plan.copy));
      fs.writeFileSync(file, `${JSON.stringify(locale, null, 2)}\n`);
    }
  }

  /** @param {string} command @param {string[]} args */
  const run = (command, args) => {
    const result = spawnSync(command, args, { cwd: root, stdio: 'inherit' });
    if (result.status !== 0) {
      fail(
        `"${command} ${args.join(' ')}" failed. Files were written; fix and re-run it.`,
      );
    }
  };
  run(process.execPath, [abs('scripts/i18n-pseudo.mjs')]);
  run(abs('node_modules/.bin/prettier'), [
    '--write',
    '--log-level=warn',
    ...plan.creates.map((file) => file.path),
    ...edited.keys(),
    'src/i18n/locales',
  ]);

  console.log('[gen] Done. Next steps:');
  [...manual, ...plan.next].forEach((step, index) =>
    console.log(`  ${index + 1}. ${step}`),
  );
};
