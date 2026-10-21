#!/usr/bin/env node
// @ts-check
/**
 * i18n consistency check (`pnpm i18n:check`).
 *
 * - Every locale in src/i18n/locales must have exactly the same keys as the
 *   source locale (en-US).
 * - Every literal key used as `t('some.key')` in src/ must exist in en-US.
 *
 * Keys passed through variables are type-checked instead (`I18nKey`).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
  const sourceKeys = new Set(
    flattenKeys(readJson(path.join(localesDir, `${SOURCE_LOCALE}.json`))),
  );

  for (const file of localeFiles) {
    const locale = path.basename(file, '.json');
    if (locale === SOURCE_LOCALE) continue;
    const keys = new Set(flattenKeys(readJson(path.join(localesDir, file))));
    const missing = [...sourceKeys].filter((k) => !keys.has(k));
    const extra = [...keys].filter((k) => !sourceKeys.has(k));
    if (missing.length)
      errors.push(`Missing keys in ${locale}: ${missing.join(', ')}`);
    if (extra.length)
      errors.push(
        `Extra keys in ${locale} (not in ${SOURCE_LOCALE}): ${extra.join(', ')}`,
      );
  }

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
