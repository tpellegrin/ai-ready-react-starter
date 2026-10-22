import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

import {
  eslintJson,
  formatDiagnostic,
  logTail,
  markedLines,
  playwright,
  prettier,
  stylelintJson,
  tsc,
  vitest,
} from './diagnostics.mjs';

const root = '/repo';
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'diagnostics-'));
afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));
/** @param {string} name @param {unknown} data */
const artifact = (name, data) => {
  const file = path.join(dir, name);
  fs.writeFileSync(file, JSON.stringify(data));
  return file;
};

describe('diagnostics parsers', () => {
  it('ESLint JSON → file:line rule message', () => {
    const file = artifact('lint.json', [
      {
        filePath: '/repo/src/views/Profile/index.tsx',
        messages: [
          {
            line: 2,
            column: 10,
            ruleId: 'starter/no-internal-styled-imports',
            message: '"_ButtonRoot" is an internal styled element',
            severity: 2,
          },
        ],
      },
      { filePath: '/repo/src/ok.ts', messages: [] },
    ]);
    const [diagnostic] = eslintJson({ root, log: '', artifact: file });
    expect(formatDiagnostic(diagnostic ?? { message: '' })).toBe(
      'src/views/Profile/index.tsx:2:10 starter/no-internal-styled-imports: "_ButtonRoot" is an internal styled element',
    );
  });

  it('Stylelint JSON, without the rule repeated in the text', () => {
    const file = artifact('stylelint.json', [
      {
        source: '/repo/src/x/styles.ts',
        warnings: [
          {
            line: 4,
            column: 10,
            rule: 'color-no-hex',
            text: 'Raw color value: use a theme token (color-no-hex)',
          },
        ],
      },
    ]);
    expect(stylelintJson({ root, log: '', artifact: file })).toEqual([
      {
        file: 'src/x/styles.ts',
        line: 4,
        column: 10,
        rule: 'color-no-hex',
        message: 'Raw color value: use a theme token',
      },
    ]);
  });

  it('tsc --pretty false lines', () => {
    expect(
      tsc({
        root,
        log: "src/a.ts(3,7): error TS2322: Type 'string' is not assignable to type 'number'.\nnoise",
      }),
    ).toEqual([
      {
        file: 'src/a.ts',
        line: 3,
        column: 7,
        rule: 'TS2322',
        message: "Type 'string' is not assignable to type 'number'.",
      },
    ]);
  });

  it('Prettier --check warnings, without the summary line', () => {
    expect(
      prettier({
        root,
        log: 'Checking formatting...\n[warn] src/a.ts\n[warn] Code style issues found in the above file. Run Prettier with --write to fix.',
      }).map((d) => d.file),
    ).toEqual(['src/a.ts']);
  });

  it('Vitest JSON failures, load errors and coverage floors', () => {
    const file = artifact('unit.json', {
      testResults: [
        {
          name: '/repo/src/a.test.ts',
          assertionResults: [
            {
              status: 'failed',
              fullName: 'a › adds',
              failureMessages: ['AssertionError: expected 2 to be 3\n    at …'],
              location: { line: 5, column: 3 },
            },
            { status: 'passed', fullName: 'a › ok', failureMessages: [] },
          ],
        },
        {
          name: '/repo/src/b.test.ts',
          message: 'SyntaxError: Unexpected token',
          assertionResults: [],
        },
      ],
    });
    const log =
      'ERROR: Coverage for functions (86.2%) does not meet "src/api/**" threshold (92%)';
    expect(vitest({ root, log, artifact: file }).map(formatDiagnostic)).toEqual(
      [
        'src/a.test.ts:5 test: a › adds: AssertionError: expected 2 to be 3',
        'src/b.test.ts test: SyntaxError: Unexpected token',
        'src/api/** coverage: functions 86.2% is below the 92% floor: add tests for the uncovered code (never lower the floor to pass).',
      ],
    );
  });

  it('Playwright JSON: failed and flaky tests with project names', () => {
    const file = artifact('e2e.json', {
      suites: [
        {
          title: 'demo/journey.spec.ts',
          file: 'demo/journey.spec.ts',
          specs: [
            {
              title: 'signs in',
              file: 'demo/journey.spec.ts',
              line: 9,
              tests: [
                {
                  projectName: 'demo',
                  status: 'unexpected',
                  results: [{ error: { message: 'Error: timed out\nmore' } }],
                },
                { projectName: 'webkit', status: 'expected', results: [] },
              ],
            },
          ],
        },
      ],
    });
    expect(
      playwright({ root, log: '', artifact: file }).map(formatDiagnostic),
    ).toEqual([
      'e2e/demo/journey.spec.ts:9 e2e:demo: signs in: Error: timed out',
    ]);
  });

  it('"✗" lines of the repository checks, with locations when present', () => {
    expect(
      markedLines({
        root,
        log: '✓ fine\n✗ docs/a.md:3 links to missing docs/b.md\n✗ fixture-x.ts (as src/x)\n[i18n-check] OK\n[i18n-check] pt-BR: missing keys a',
      }),
    ).toEqual([
      { file: 'docs/a.md', line: 3, message: 'links to missing docs/b.md' },
      { message: 'fixture-x.ts (as src/x)' },
      { message: '[i18n-check] pt-BR: missing keys a' },
    ]);
  });

  it('keeps the end of a log for failures no parser understands', () => {
    expect(logTail('a\n\nb\nc\n', 2)).toEqual(['b', 'c']);
  });
});
