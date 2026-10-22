#!/usr/bin/env node
// @ts-check
/**
 * Architecture check (`pnpm arch:check`).
 *
 * 1. Fixtures: every file in scripts/architecture/fixtures is written to the
 *    path in its header (always inside an `__arch__` folder under src/),
 *    linted with the repository's unmodified ESLint (or Stylelint)
 *    configuration, and removed again. Positive fixtures must pass, negative
 *    ones must fail with the expected rule and message, so a misconfigured
 *    rule can never pass silently. They exercise element patterns, alias
 *    resolution, relative paths, re-exports, dynamic imports and type-aware
 *    parsing, and are never part of the committed source or the build.
 * 2. Protected suppressions: the whole of src/ is linted once more with
 *    inline configuration disabled, so a blanket `/* eslint-disable *\/` or
 *    a disabled architecture rule (starter/no-protected-suppression) cannot
 *    hide itself.
 *
 * Fixtures that need a feature or a shared component use throwaway ones
 * copied from scripts/architecture/support/<area>/<name> to src/<area>/<name>
 * for the run, so the checks never depend on removable product code.
 * `__arch__/` and the support targets are gitignored in case the process is
 * killed mid-run; stale copies are removed first.
 *
 * Fixture header:
 *   // @fixture-path src/components/__arch__/Example.tsx   (must contain /__arch__/)
 *   // @lint stylelint      (optional; default: eslint)
 *   // @expect boundaries/dependencies: substring of the expected message
 *   // @expect none         (positive fixture: no errors at all)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { ESLint } from 'eslint';
import stylelint from 'stylelint';

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);
const fixturesDir = path.join(root, 'scripts/architecture/fixtures');
const supportDir = path.join(root, 'scripts/architecture/support');
const SUPPRESSION_RULE = 'starter/no-protected-suppression';
const ARCH_DIR = '__arch__';

/** support/<area>/<name> → src/<area>/<name> */
const supportCopies = fs
  .readdirSync(supportDir, { withFileTypes: true })
  .filter((area) => area.isDirectory())
  .flatMap((area) =>
    fs.readdirSync(path.join(supportDir, area.name)).map((name) => ({
      from: path.join(supportDir, area.name, name),
      to: path.join(root, 'src', area.name, name),
    })),
  );

/** @param {string} source */
const parseHeader = (source) => {
  const fixturePath = /^\/\/ @fixture-path (\S+)$/m.exec(source)?.[1];
  const tool = /^\/\/ @lint (\S+)$/m.exec(source)?.[1] ?? 'eslint';
  const expectations = [...source.matchAll(/^\/\/ @expect (.+)$/gm)].map(
    (match) => match[1]?.trim() ?? '',
  );
  return { fixturePath, tool, expectations };
};

/** @param {string} dir @returns {string[]} */
const findArchDirs = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (!entry.isDirectory()) return [];
    const full = path.join(dir, entry.name);
    return entry.name === ARCH_DIR ? [full] : findArchDirs(full);
  });

const removeScratch = () => {
  for (const dir of findArchDirs(path.join(root, 'src'))) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  for (const { to } of supportCopies) {
    fs.rmSync(to, { recursive: true, force: true });
  }
};

/** @param {string} dir @returns {string[]} */
const listSourceFiles = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return listSourceFiles(full);
    return /\.tsx?$/.test(entry.name) && !entry.name.endsWith('.d.ts')
      ? [full]
      : [];
  });

const fixtures = fs
  .readdirSync(fixturesDir)
  .filter((file) => /\.tsx?$/.test(file))
  .sort()
  .map((file) => {
    const source = fs.readFileSync(path.join(fixturesDir, file), 'utf8');
    return { file, source, ...parseHeader(source) };
  });

let failures = 0;
for (const fixture of fixtures) {
  if (
    !fixture.fixturePath?.startsWith('src/') ||
    !fixture.fixturePath.includes(`/${ARCH_DIR}/`) ||
    fixture.expectations.length === 0 ||
    !['eslint', 'stylelint'].includes(fixture.tool)
  ) {
    console.error(
      `✗ ${fixture.file}: needs @fixture-path under src/ containing /${ARCH_DIR}/, at least one @expect, and @lint eslint|stylelint`,
    );
    failures += 1;
  }
}

/**
 * @typedef {{ ruleId: string | null, message: string, line: number }} Problem
 * @param {Map<string, Problem[]>} map
 * @param {string} file
 * @param {Problem[]} problems
 */
const addProblems = (map, file, problems) => {
  const known = map.get(file) ?? [];
  for (const problem of problems) {
    const duplicate = known.some(
      (p) =>
        p.ruleId === problem.ruleId &&
        p.line === problem.line &&
        p.message === problem.message,
    );
    if (!duplicate) known.push(problem);
  }
  map.set(file, known);
};

/** @param {import('eslint').ESLint.LintResult[]} results @param {Map<string, Problem[]>} into */
const collectEslint = (results, into) => {
  for (const result of results) {
    addProblems(
      into,
      result.filePath,
      result.messages
        .filter((m) => m.severity === 2)
        .map((m) => ({ ruleId: m.ruleId, message: m.message, line: m.line })),
    );
  }
};

removeScratch();
/** @type {Map<string, Problem[]>} */
const problemsByFile = new Map();
/** @type {Map<string, Problem[]>} */
const suppressionsInSource = new Map();
try {
  for (const { from, to } of supportCopies) {
    fs.cpSync(from, to, { recursive: true });
  }
  for (const { fixturePath, source } of fixtures) {
    if (!fixturePath) continue;
    const target = path.join(root, fixturePath);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, source);
  }
  const targetOf = (/** @type {{ fixturePath?: string | undefined }} */ f) =>
    f.fixturePath ? [path.join(root, f.fixturePath)] : [];
  const eslintTargets = fixtures
    .filter((f) => f.tool === 'eslint')
    .flatMap(targetOf);
  const stylelintTargets = fixtures
    .filter((f) => f.tool === 'stylelint')
    .flatMap(targetOf);

  collectEslint(
    await new ESLint({ cwd: root }).lintFiles(eslintTargets),
    problemsByFile,
  );

  const { results } = await stylelint.lint({
    files: stylelintTargets,
    cwd: root,
  });
  for (const result of results) {
    if (!result.source) continue;
    addProblems(
      problemsByFile,
      result.source,
      result.warnings
        .filter((w) => w.severity === 'error')
        .map((w) => ({ ruleId: w.rule, message: w.text, line: w.line })),
    );
  }

  // Inline configuration off: suppressions cannot hide themselves.
  const noInline = new ESLint({
    cwd: root,
    allowInlineConfig: false,
    ruleFilter: ({ ruleId }) => ruleId === SUPPRESSION_RULE,
  });
  const sourceFiles = listSourceFiles(path.join(root, 'src'));
  for (const result of await noInline.lintFiles(sourceFiles)) {
    const isFixture = eslintTargets.includes(result.filePath);
    collectEslint([result], isFixture ? problemsByFile : suppressionsInSource);
  }
} finally {
  removeScratch();
}

for (const { file, fixturePath, expectations } of fixtures) {
  if (!fixturePath) continue;
  const errors = problemsByFile.get(path.join(root, fixturePath)) ?? [];
  const problems = [];

  if (expectations.includes('none')) {
    for (const error of errors) {
      problems.push(`unexpected ${error.ruleId ?? 'error'}: ${error.message}`);
    }
  } else {
    const unmatched = [...errors];
    for (const expectation of expectations) {
      const [ruleId = '', text = ''] = expectation.split(/:\s(.*)/s);
      const index = unmatched.findIndex(
        (error) =>
          error.ruleId === ruleId.trim() && error.message.includes(text.trim()),
      );
      if (index === -1) problems.push(`expected ${expectation}`);
      else unmatched.splice(index, 1);
    }
    for (const error of unmatched) {
      problems.push(`unexpected ${error.ruleId ?? 'error'}: ${error.message}`);
    }
  }

  if (problems.length) {
    failures += 1;
    console.error(`✗ ${file} (as ${fixturePath})`);
    for (const problem of problems) console.error(`    ${problem}`);
  } else {
    const kind = expectations.includes('none') ? 'allowed' : 'rejected';
    const detail = errors
      .map((e) => `\n      ${e.ruleId}: ${e.message}`)
      .join('');
    console.log(`✓ ${file}: ${kind}${detail}`);
  }
}

for (const [file, problems] of suppressionsInSource) {
  for (const problem of problems) {
    failures += 1;
    console.error(
      `✗ ${path.relative(root, file)}:${problem.line} ${problem.ruleId}: ${problem.message}`,
    );
  }
}

if (failures) {
  console.error(
    `\n[arch:check] ${failures} problem(s) (${fixtures.length} fixtures, protected-suppression scan of src/).`,
  );
  process.exit(1);
}
console.log(
  `\n[arch:check] OK (${fixtures.length} fixtures; no protected rule is suppressed in src/)`,
);
