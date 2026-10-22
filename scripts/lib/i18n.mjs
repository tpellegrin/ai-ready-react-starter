// @ts-check
/**
 * Locale consistency rules used by `pnpm i18n:check` (scripts/i18n-check.mjs),
 * kept pure so scripts/lib/i18n.test.mjs can prove them with fixture data.
 */

/**
 * @param {unknown} value
 * @param {string} [prefix]
 * @returns {Map<string, unknown>} dotted key → leaf value
 */
export const flattenMessages = (value, prefix = '') => {
  /** @type {Map<string, unknown>} */
  const leaves = new Map();
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    if (prefix) leaves.set(prefix, value);
    return leaves;
  }
  for (const [key, child] of Object.entries(value)) {
    for (const [leaf, leafValue] of flattenMessages(
      child,
      prefix ? `${prefix}.${key}` : key,
    )) {
      leaves.set(leaf, leafValue);
    }
  }
  return leaves;
};

/** `{name}` placeholders of a message, sorted. @param {unknown} message */
export const placeholdersOf = (message) =>
  typeof message === 'string'
    ? [...new Set([...message.matchAll(/\{(\w+)\}/g)].map((m) => m[1] ?? ''))]
        .filter(Boolean)
        .sort()
    : [];

/**
 * Key parity and placeholder parity of every locale against the source.
 *
 * @param {{ name: string, messages: unknown }} source
 * @param {Array<{ name: string, messages: unknown }>} locales
 * @returns {string[]} one line per problem
 */
export const findLocaleProblems = (source, locales) => {
  const sourceLeaves = flattenMessages(source.messages);
  const problems = [];
  for (const locale of locales) {
    const leaves = flattenMessages(locale.messages);
    const missing = [...sourceLeaves.keys()].filter((k) => !leaves.has(k));
    const extra = [...leaves.keys()].filter((k) => !sourceLeaves.has(k));
    if (missing.length) {
      problems.push(`${locale.name}: missing keys ${missing.join(', ')}`);
    }
    if (extra.length) {
      problems.push(
        `${locale.name}: keys not in ${source.name} ${extra.join(', ')}`,
      );
    }
    for (const [key, message] of sourceLeaves) {
      if (!leaves.has(key)) continue;
      const expected = placeholdersOf(message);
      const actual = placeholdersOf(leaves.get(key));
      if (expected.join() !== actual.join()) {
        const list = (/** @type {string[]} */ names) =>
          names.length ? names.map((n) => `{${n}}`).join(' ') : 'none';
        problems.push(
          `${locale.name} › ${key}: placeholders must match ${source.name} (expected ${list(expected)}, found ${list(actual)}); translate the text around them, never the names`,
        );
      }
    }
  }
  return problems;
};
