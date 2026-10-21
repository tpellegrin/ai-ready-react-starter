#!/usr/bin/env node
// @ts-check
/**
 * Architecture check (`pnpm arch:check`).
 *
 * Lints every fixture in scripts/architecture/fixtures with the repository's
 * unmodified ESLint configuration. Each fixture is written to the path in its
 * header (always inside an `__arch__` folder under src/), linted, and removed
 * again, so it exercises the actual boundary rules (element patterns, alias
 * resolution, re-exports, dynamic imports, type-aware parsing) while never
 * being part of the committed source or the build. `__arch__/` is gitignored
 * in case the process is killed mid-run; stale folders are removed first.
 *
 * Fixtures that need a feature import a throwaway one, copied from
 * scripts/architecture/support/arch-fixture-feature for the run, so the
 * checks never depend on removable product code (e.g. the reference feature).
 *
 * Fixture header:
 *   // @fixture-path src/components/__arch__/Example.tsx   (must contain /__arch__/)
 *   // @expect boundaries/dependencies: substring of the expected message
 *   // @expect none            (positive fixture: no errors at all)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { ESLint } from 'eslint';

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);
const fixturesDir = path.join(root, 'scripts/architecture/fixtures');
const supportFeature = path.join(
  root,
  'scripts/architecture/support/arch-fixture-feature',
);
const supportTarget = path.join(root, 'src/features/arch-fixture-feature');

/** @param {string} source */
const parseHeader = (source) => {
  const fixturePath = /^\/\/ @fixture-path (\S+)$/m.exec(source)?.[1];
  const expectations = [...source.matchAll(/^\/\/ @expect (.+)$/gm)].map(
    (match) => match[1]?.trim() ?? '',
  );
  return { fixturePath, expectations };
};

const ARCH_DIR = '__arch__';

/** @param {string} dir @returns {string[]} */
const findArchDirs = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (!entry.isDirectory()) return [];
    const full = path.join(dir, entry.name);
    return entry.name === ARCH_DIR ? [full] : findArchDirs(full);
  });

const removeArchDirs = () => {
  for (const dir of findArchDirs(path.join(root, 'src'))) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  fs.rmSync(supportTarget, { recursive: true, force: true });
};

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
    fixture.expectations.length === 0
  ) {
    console.error(
      `✗ ${fixture.file}: needs @fixture-path under src/ containing /${ARCH_DIR}/ and at least one @expect`,
    );
    failures += 1;
  }
}

removeArchDirs();
/** @type {Map<string, import('eslint').Linter.LintMessage[]>} */
const messagesByFile = new Map();
try {
  fs.cpSync(supportFeature, supportTarget, { recursive: true });
  for (const { fixturePath, source } of fixtures) {
    if (!fixturePath) continue;
    const target = path.join(root, fixturePath);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, source);
  }
  const eslint = new ESLint({ cwd: root });
  const targets = fixtures.flatMap((f) =>
    f.fixturePath ? [path.join(root, f.fixturePath)] : [],
  );
  for (const result of await eslint.lintFiles(targets)) {
    messagesByFile.set(result.filePath, result.messages);
  }
} finally {
  removeArchDirs();
}

for (const { file, fixturePath, expectations } of fixtures) {
  if (!fixturePath) continue;
  const errors = (
    messagesByFile.get(path.join(root, fixturePath)) ?? []
  ).filter((m) => m.severity === 2);
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

if (failures) {
  console.error(
    `\n[arch:check] ${failures} of ${fixtures.length} fixtures failed.`,
  );
  process.exit(1);
}
console.log(`\n[arch:check] OK (${fixtures.length} fixtures)`);
