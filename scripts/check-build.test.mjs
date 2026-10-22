import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

const script = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'check-build.mjs',
);

/** @type {string[]} */
const dirs = [];
afterEach(() => {
  for (const dir of dirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

/**
 * A minimal finished build (dist/ + its module report) whose entry chunk
 * contains `modules`, inspected by `pnpm check:build`.
 * @param {string[]} modules
 */
const inspect = (modules) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'check-build-test-'));
  dirs.push(root);
  fs.mkdirSync(path.join(root, 'dist/assets'), { recursive: true });
  fs.mkdirSync(path.join(root, 'reports/build'), { recursive: true });
  fs.writeFileSync(
    path.join(root, 'dist/index.html'),
    '<script type="module" src="/assets/index.js"></script>',
  );
  fs.writeFileSync(path.join(root, 'dist/assets/index.js'), 'export {};');
  fs.writeFileSync(
    path.join(root, 'reports/build/dist.json'),
    JSON.stringify({
      mode: 'production',
      base: '/',
      assets: [],
      chunks: [
        {
          fileName: 'assets/index.js',
          isEntry: true,
          isDynamicEntry: false,
          facadeModule: 'src/main.tsx',
          imports: [],
          dynamicImports: [],
          modules: Object.fromEntries(modules.map((m) => [m, 10])),
        },
      ],
    }),
  );
  return spawnSync(process.execPath, [script], { cwd: root, encoding: 'utf8' });
};

describe('pnpm check:build', () => {
  it('refuses reference images, plans and evidence in a build', () => {
    const result = inspect([
      'src/main.tsx',
      'design/expense-overview/references/overview.png',
      'reports/design/expense-overview/run-1/report.json',
    ]);
    expect(result.status).toBe(1);
    expect(result.stderr + result.stdout).toContain(
      'design references, plans or evidence in the build: design/expense-overview/references/overview.png (assets/index.js), reports/design/expense-overview/run-1/report.json (assets/index.js)',
    );
  });

  it('does not report them when the build has none', () => {
    const result = inspect(['src/main.tsx']);
    expect(result.stderr + result.stdout).not.toContain(
      'design references, plans or evidence',
    );
  });
});
