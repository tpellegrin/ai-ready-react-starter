#!/usr/bin/env node
// @ts-check
/**
 * Regenerates src/i18n/locales/pseudo.json from en-US.json.
 *
 *   pnpm i18n:pseudo           write pseudo.json
 *   node scripts/i18n-pseudo.mjs --check   fail if pseudo.json is stale
 *
 * The pseudo locale makes untranslated (hardcoded) copy and truncation easy
 * to spot: text is accented, upper-cased and wrapped in "Ꞩ" markers, while
 * {placeholders} are preserved.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
const localesDir = path.join(projectRoot, 'src', 'i18n', 'locales');
const sourceFile = path.join(localesDir, 'en-US.json');
const targetFile = path.join(localesDir, 'pseudo.json');

/** @type {Record<string, string>} */
const ACCENTS = {
  A: 'Å',
  B: 'β',
  C: 'Ĉ',
  D: 'Đ',
  E: 'Ę',
  G: 'Ǥ',
  H: 'Ħ',
  I: 'Į',
  J: 'Ĵ',
  K: 'Ķ',
  L: 'Ļ',
  N: 'Ɲ',
  O: 'Ø',
  P: 'Ƥ',
  R: 'Ř',
  S: 'Ŝ',
  T: 'Ŧ',
  U: 'Ũ',
  V: 'Ʋ',
  W: 'Ŵ',
  Y: 'Ɏ',
  Z: 'Ž',
};

/** @param {string} text */
export const pseudoLocalize = (text) => {
  const parts = text.split(/(\{\w+\})/);
  const transformed = parts
    .map((part) =>
      /^\{\w+\}$/.test(part)
        ? part
        : [...part.toUpperCase()].map((ch) => ACCENTS[ch] ?? ch).join(''),
    )
    .join('');
  return `Ꞩ${transformed}Ꞩ`;
};

/**
 * @param {unknown} value
 * @returns {unknown}
 */
const transform = (value) => {
  if (typeof value === 'string') return pseudoLocalize(value);
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, transform(child)]),
    );
  }
  return value;
};

const expected = `${JSON.stringify(
  transform(JSON.parse(fs.readFileSync(sourceFile, 'utf8'))),
  null,
  2,
)}\n`;

if (process.argv.includes('--check')) {
  const current = fs.existsSync(targetFile)
    ? fs.readFileSync(targetFile, 'utf8')
    : '';
  if (current !== expected) {
    console.error(
      '[i18n-pseudo] pseudo.json is out of date. Run `pnpm i18n:pseudo`.',
    );
    process.exit(1);
  }
  console.log('[i18n-pseudo] OK');
} else {
  fs.writeFileSync(targetFile, expected);
  console.log(`[i18n-pseudo] Wrote ${path.relative(projectRoot, targetFile)}`);
}
