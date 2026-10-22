// @ts-check
/**
 * Turns tool output into short, actionable diagnostics for `pnpm verify`
 * (scripts/verify.mjs). Each parser reads the tool's own machine-readable
 * output where one exists (ESLint/Stylelint JSON, Vitest/Playwright JSON
 * reporters, `tsc --pretty false`), otherwise its stable text lines. When a
 * parser finds nothing in a failed step, the runner reports the log tail and
 * the full log path instead — never a guessed location.
 */
import fs from 'node:fs';
import path from 'node:path';

/**
 * @typedef {{
 *   file?: string | undefined,
 *   line?: number | undefined,
 *   column?: number | undefined,
 *   rule?: string | undefined,
 *   message: string,
 * }} Diagnostic
 * @typedef {{ log: string, root: string, artifact?: string | undefined }} ParseInput
 * @typedef {(input: ParseInput) => Diagnostic[]} Parser
 */

/** @param {string} root @param {string} file */
const relativeTo = (root, file) =>
  path.isAbsolute(file) ? path.relative(root, file) : file;

/** @param {string | undefined} file @returns {unknown} */
const readJson = (file) => {
  if (!file || !fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
};

/** @param {string} text */
const firstLine = (text) =>
  (text.split('\n').find((line) => line.trim()) ?? '').trim();

// eslint-disable-next-line no-control-regex -- strip ANSI color codes
const ANSI = /\u001b\[[0-9;]*m/g;
/** @param {string} text */
export const stripAnsi = (text) => text.replace(ANSI, '');

/** ESLint `--format json` (artifact). @type {Parser} */
export const eslintJson = ({ root, artifact }) => {
  const results =
    /** @type {Array<{ filePath: string, messages: Array<{ line?: number, column?: number, ruleId: string | null, message: string, severity: number }> }> | null} */ (
      readJson(artifact)
    );
  return (results ?? []).flatMap((result) =>
    result.messages
      .filter((m) => m.severity === 2 || m.severity === 1)
      .map((m) => ({
        file: relativeTo(root, result.filePath),
        line: m.line,
        column: m.column,
        rule: m.ruleId ?? 'eslint',
        message: m.message,
      })),
  );
};

/** Stylelint `--formatter json` (artifact). @type {Parser} */
export const stylelintJson = ({ root, artifact }) => {
  const results =
    /** @type {Array<{ source: string, warnings: Array<{ line: number, column: number, rule: string, text: string }> }> | null} */ (
      readJson(artifact)
    );
  return (results ?? []).flatMap((result) =>
    result.warnings.map((w) => ({
      file: relativeTo(root, result.source),
      line: w.line,
      column: w.column,
      rule: w.rule,
      message: w.text.replace(new RegExp(`\\s*\\(${w.rule}\\)$`), ''),
    })),
  );
};

/** `tsc --pretty false`: file(line,col): error TSxxxx: message. @type {Parser} */
export const tsc = ({ log }) =>
  [
    ...stripAnsi(log).matchAll(/^(.+?)\((\d+),(\d+)\): error (TS\d+): (.*)$/gm),
  ].map(([, file = '', line = '0', column = '0', rule, message = '']) => ({
    file,
    line: Number(line),
    column: Number(column),
    rule,
    message,
  }));

/** `prettier --check`: one "[warn] file" line per unformatted file. @type {Parser} */
export const prettier = ({ log }) =>
  [...stripAnsi(log).matchAll(/^\[warn\] (.+)$/gm)]
    .map(([, file = '']) => file.trim())
    .filter((file) => !/^Code style issues/.test(file))
    .map((file) => ({
      file,
      rule: 'prettier',
      message:
        'Not formatted: run `pnpm format` (or prettier --write on the file).',
    }));

/**
 * Vitest `--reporter=json` (artifact) for failed tests, plus coverage
 * threshold errors from the log.
 * @type {Parser}
 */
export const vitest = ({ root, log, artifact }) => {
  const report =
    /** @type {{ testResults?: Array<{ name: string, message?: string, assertionResults: Array<{ status: string, fullName: string, failureMessages: string[], location?: { line: number, column: number } | null }> }> } | null} */ (
      readJson(artifact)
    );
  /** @type {Diagnostic[]} */
  const diagnostics = [];
  for (const file of report?.testResults ?? []) {
    const failed = file.assertionResults.filter((t) => t.status === 'failed');
    for (const test of failed) {
      diagnostics.push({
        file: relativeTo(root, file.name),
        line: test.location?.line,
        rule: 'test',
        message: `${test.fullName}: ${firstLine(stripAnsi(test.failureMessages[0] ?? 'failed'))}`,
      });
    }
    // A file that failed to load (syntax error, failing hook) has no tests.
    if (!failed.length && file.message) {
      diagnostics.push({
        file: relativeTo(root, file.name),
        rule: 'test',
        message: firstLine(stripAnsi(file.message)),
      });
    }
  }
  for (const [, metric, actual, scope, floor] of stripAnsi(log).matchAll(
    /ERROR: Coverage for (\w+) \(([\d.]+)%\) does not meet (?:"(.+?)" )?threshold \(([\d.]+)%\)/g,
  )) {
    diagnostics.push({
      file: scope ?? 'global',
      rule: 'coverage',
      message: `${metric} ${actual}% is below the ${floor}% floor: add tests for the uncovered code (never lower the floor to pass).`,
    });
  }
  return diagnostics;
};

/** Playwright `--reporter=json` (artifact): failed and flaky tests. @type {Parser} */
export const playwright = ({ artifact }) => {
  /** @typedef {{ title: string, file?: string, line?: number, specs?: Spec[], suites?: Suite[] }} Suite */
  /** @typedef {{ title: string, file: string, line: number, tests: Array<{ projectName: string, status: string, results: Array<{ error?: { message?: string } }> }> }} Spec */
  const report = /** @type {{ suites?: Suite[] } | null} */ (
    readJson(artifact)
  );
  /** @type {Diagnostic[]} */
  const diagnostics = [];
  /** @param {Suite} suite @param {string[]} titles */
  const visit = (suite, titles) => {
    for (const spec of suite.specs ?? []) {
      for (const test of spec.tests) {
        if (test.status === 'expected' || test.status === 'skipped') continue;
        const error = test.results.find((r) => r.error)?.error?.message ?? '';
        diagnostics.push({
          file: path.join('e2e', spec.file),
          line: spec.line,
          rule: `e2e:${test.projectName}${test.status === 'flaky' ? ' (flaky)' : ''}`,
          message: `${[...titles, spec.title].join(' › ')}: ${firstLine(stripAnsi(error)) || test.status}`,
        });
      }
    }
    for (const child of suite.suites ?? []) {
      visit(child, child.file ? titles : [...titles, child.title]);
    }
  };
  for (const suite of report?.suites ?? []) visit(suite, []);
  return diagnostics;
};

/**
 * The repository's own checks print one "✗ …" line per problem
 * (arch:check, gen:check, adopt:check, check:build, docs:check) or
 * "[i18n-check] …" lines. @type {Parser}
 */
export const markedLines = ({ log }) =>
  stripAnsi(log)
    .split('\n')
    .map((line) => line.trim())
    .filter(
      (line) =>
        /^✗ /.test(line) ||
        (/^\[i18n-(check|pseudo)\] /.test(line) && !/ OK\b/.test(line)),
    )
    .map((line) => {
      const located = /^✗ ((?:src|e2e|scripts|docs)\/[^\s:]+):(\d+) (.*)$/.exec(
        line,
      );
      return located
        ? {
            file: located[1],
            line: Number(located[2]),
            message: located[3] ?? '',
          }
        : { message: line.replace(/^✗ /, '') };
    });

/** @type {Record<string, Parser>} */
export const parsers = {
  eslintJson,
  stylelintJson,
  tsc,
  prettier,
  vitest,
  playwright,
  markedLines,
};

/** Last non-empty lines of a log, for failures no parser understood. */
export const logTail = (/** @type {string} */ log, lines = 20) =>
  stripAnsi(log)
    .split('\n')
    .filter((line) => line.trim())
    .slice(-lines);

/** One line per diagnostic: "file:line:col rule message". */
export const formatDiagnostic = (/** @type {Diagnostic} */ d) => {
  const where = d.file
    ? `${d.file}${d.line ? `:${d.line}${d.column ? `:${d.column}` : ''}` : ''} `
    : '';
  return `${where}${d.rule ? `${d.rule}: ` : ''}${d.message}`;
};
