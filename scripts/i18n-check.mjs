#!/usr/bin/env node
// @ts-check
/**
 * i18n consistency check (`pnpm i18n:check`).
 *
 * - Every locale in src/i18n/locales (pseudo included) has exactly the keys
 *   of the source locale (en-US), and every message the same `{placeholder}`
 *   names (rules in scripts/lib/i18n.mjs).
 * - Every literal key used as `t('some.key')` in src/ exists in en-US.
 *
 * Limits: keys built at runtime (`t(\`a.${b}\`)`) cannot be checked here;
 * `t()` only accepts `I18nKey`, so TypeScript rejects unknown keys and
 * computed keys must come from a typed map (e.g. FORM_ERROR_KEYS).
 * `pnpm i18n:pseudo` (and its --check) keeps the pseudo-locale current.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { findLocaleProblems } from './lib/i18n.mjs';

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
const srcDir = path.join(projectRoot, 'src');
const localesDir = path.join(srcDir, 'i18n', 'locales');
const SOURCE_LOCALE = 'en-US';

/** @param {string} file @returns {unknown} */
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));

/**
 * @param {unknown} value
 * @param {string} [prefix]
 * @returns {string[]}
 */
const flattenKeys = (value, prefix = '') => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return prefix ? [prefix] : [];
  }
  return Object.entries(value).flatMap(([key, child]) =>
    flattenKeys(child, prefix ? `${prefix}.${key}` : key),
  );
};

/**
 * @param {string} dir
 * @returns {string[]}
 */
const walkSources = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walkSources(full);
    return /\.(ts|tsx)$/.test(entry.name) ? [full] : [];
  });

const main = () => {
  const errors = [];
  const localeFiles = fs
    .readdirSync(localesDir)
    .filter((f) => f.endsWith('.json'));
  const load = (/** @type {string} */ file) => ({
    name: path.basename(file, '.json'),
    messages: readJson(path.join(localesDir, file)),
  });
  const source = load(`${SOURCE_LOCALE}.json`);
  const sourceKeys = new Set(flattenKeys(source.messages));
  errors.push(
    ...findLocaleProblems(
      source,
      localeFiles.filter((file) => file !== `${SOURCE_LOCALE}.json`).map(load),
    ),
  );

  const keyPattern = /\bt\(\s*['"]([a-zA-Z0-9_.-]+)['"]/g;
  const usedMissing = new Set();
  for (const file of walkSources(srcDir)) {
    const text = fs.readFileSync(file, 'utf8');
    for (const match of text.matchAll(keyPattern)) {
      const key = match[1];
      if (key && !sourceKeys.has(key))
        usedMissing.add(`${key} (${path.relative(projectRoot, file)})`);
    }
  }
  if (usedMissing.size) {
    errors.push(
      `Keys used in code but missing from ${SOURCE_LOCALE}: ${[...usedMissing].join(', ')}`,
    );
  }

  if (errors.length) {
    for (const error of errors) console.error(`[i18n-check] ${error}`);
    process.exit(1);
  }
  console.log(
    `[i18n-check] OK (${localeFiles.length} locales, ${sourceKeys.size} keys)`,
  );
};

main();
