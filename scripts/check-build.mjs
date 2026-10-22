#!/usr/bin/env node
// @ts-check
/**
 * Inspects a finished build (after `pnpm build` or `pnpm build:demo`).
 *
 *   node scripts/check-build.mjs [--dir dist] [--profile production|demo] [--base /sub/]
 *
 * - Budgets: gzip size of the initial JS (entry + static imports), all JS,
 *   CSS, and the largest lazy chunk.
 * - Code splitting: routes that must stay lazy are dynamic chunks that the
 *   entry never imports statically.
 * - Production profile: no demo, mock, MSW, test or story code, no
 *   mockServiceWorker.js and no source maps in the output.
 * - Any profile: nothing from design/ (reference images, plans) or
 *   reports/ (evidence).
 * - Demo profile: the MSW worker is emitted and demo code stays lazy.
 * - Base path: index.html references assets under the expected base.
 *
 * Reads reports/build/<dir>.json, written by scripts/build/module-report.mjs.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { parseArgs } from 'node:util';
import { gzipSync } from 'node:zlib';

/**
 * Gzip budgets in kB. Set a little above the measured size (see
 * docs/guardrails.md). Raise one only in the change that explains why.
 * After adoption these are the product's own budgets: measure and change
 * them as docs/adoption.md ("Own the performance budgets") describes.
 */
const BUDGETS = {
  production: {
    initialJsKb: 185,
    totalJsKb: 225,
    cssKb: 2,
    largestLazyChunkKb: 25,
  },
  // Demo builds add the in-browser mock API (MSW + handlers), loaded lazily.
  demo: {
    initialJsKb: 185,
    totalJsKb: 315,
    cssKb: 2,
    largestLazyChunkKb: 95,
  },
};

/** Modules that must stay out of the initial bundle (loaded with import()). */
const LAZY_MODULES = {
  production: [
    'src/views/guest/SignIn/index.tsx',
    // starter:reference-start
    'src/views/user/Resources/index.tsx',
    // starter:reference-end
  ],
  demo: [
    'src/views/guest/SignIn/index.tsx',
    'src/mocks/browser.ts',
    // starter:reference-start
    'src/views/user/Resources/index.tsx',
    // starter:reference-end
    // starter:demo-start
    'src/demo/DemoHub/index.tsx',
    // starter:demo-end
  ],
};

/** Source that must never reach a real (non-demo) build. */
const PRODUCTION_FORBIDDEN_MODULES = [
  { pattern: /^src\/demo\//, reason: 'demo code' },
  { pattern: /^src\/mocks\//, reason: 'mock API code' },
  { pattern: /^src\/features\/[^/]+\/mocks\//, reason: 'feature mock code' },
  {
    pattern: /node_modules\/(?:\.pnpm\/[^/]+\/node_modules\/)?msw\//,
    reason: 'MSW',
  },
  { pattern: /react-query-devtools/, reason: 'React Query devtools' },
];

/** Never in any build. */
const ALWAYS_FORBIDDEN_MODULES = [
  { pattern: /^src\/test\//, reason: 'test utilities' },
  { pattern: /\.(test|stories)\.tsx?$/, reason: 'tests or stories' },
  // Reference images can be private; plans and evidence are task artifacts.
  {
    pattern: /^(design|reports)\//,
    reason: 'design references, plans or evidence',
  },
];

const { values } = parseArgs({
  options: {
    dir: { type: 'string', default: 'dist' },
    profile: { type: 'string', default: 'production' },
    base: { type: 'string' },
  },
});

const root = process.cwd();
const dir = values.dir;
const profile = values.profile;
if (profile !== 'production' && profile !== 'demo') {
  console.error(
    `[check-build] Unknown --profile "${profile}" (production|demo).`,
  );
  process.exit(2);
}

/** @type {string[]} */
const failures = [];
/** @param {string} message */
const fail = (message) => failures.push(message);

const outDir = join(root, dir);
const reportPath = join(root, 'reports/build', `${dir.split('/').pop()}.json`);
if (!existsSync(join(outDir, 'index.html'))) {
  console.error(`[check-build] ${dir}/index.html not found. Build first.`);
  process.exit(2);
}
if (!existsSync(reportPath)) {
  console.error(
    `[check-build] ${relative(root, reportPath)} not found. Rebuild with the project Vite config.`,
  );
  process.exit(2);
}
if (
  statSync(reportPath).mtimeMs + 60_000 <
  statSync(join(outDir, 'index.html')).mtimeMs
) {
  console.error(
    '[check-build] The module report is older than the build. Rebuild.',
  );
  process.exit(2);
}

/**
 * @typedef {{
 *   fileName: string,
 *   isEntry: boolean,
 *   isDynamicEntry: boolean,
 *   facadeModule: string | null,
 *   imports: string[],
 *   dynamicImports: string[],
 *   modules: Record<string, number>,
 * }} ReportChunk
 * @typedef {{ mode: string, base: string, chunks: ReportChunk[], assets: string[] }} BuildReport
 */
/** @param {string} file @returns {unknown} */
const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'));
const report = /** @type {BuildReport} */ (readJson(reportPath));
const chunksByFile = new Map(
  report.chunks.map((chunk) => [chunk.fileName, chunk]),
);

/** @param {string} file */
const gzipKb = (file) =>
  gzipSync(readFileSync(join(outDir, file)), { level: 9 }).length / 1024;
/** @param {string} directory @returns {string[]} */
const listFiles = (directory) =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? listFiles(path) : [relative(outDir, path)];
  });
const files = listFiles(outDir);

// --- Initial graph: entry chunks and everything they import statically ---
/** @type {Set<string>} */
const initial = new Set();
/** @param {string} fileName */
const visit = (fileName) => {
  if (initial.has(fileName)) return;
  initial.add(fileName);
  for (const imported of chunksByFile.get(fileName)?.imports ?? [])
    visit(imported);
};
for (const chunk of report.chunks) if (chunk.isEntry) visit(chunk.fileName);

// --- Budgets ---
const jsFiles = files.filter(
  (file) => file.endsWith('.js') && file !== 'mockServiceWorker.js',
);
const cssFiles = files.filter((file) => file.endsWith('.css'));
/** @param {string[]} list */
const sum = (list) => list.reduce((total, file) => total + gzipKb(file), 0);
const initialJs = sum([...initial]);
const totalJs = sum(jsFiles);
const css = sum(cssFiles);
const lazyChunks = jsFiles.filter((file) => !initial.has(file));
const largestLazy = lazyChunks
  .map((file) => ({ file, kb: gzipKb(file) }))
  .sort((a, b) => b.kb - a.kb)[0] ?? { file: '-', kb: 0 };

const budget = BUDGETS[profile];
/** @type {Array<[string, number, number]>} */
const budgetRows = [
  ['initial JS', initialJs, budget.initialJsKb],
  ['total JS', totalJs, budget.totalJsKb],
  ['CSS', css, budget.cssKb],
  [
    `largest lazy chunk (${largestLazy.file})`,
    largestLazy.kb,
    budget.largestLazyChunkKb,
  ],
];
for (const [label, actual, limit] of budgetRows) {
  if (actual > limit) {
    fail(
      `Budget exceeded: ${label} is ${actual.toFixed(1)} kB gzip (budget ${limit} kB).`,
    );
  }
}

// --- Code splitting ---
for (const module of LAZY_MODULES[profile]) {
  const owner = report.chunks.find((chunk) => module in chunk.modules);
  if (!owner) {
    fail(`Expected lazy module ${module} is missing from the build.`);
  } else if (initial.has(owner.fileName)) {
    fail(
      `${module} is in the initial bundle (${owner.fileName}); it must be loaded with import().`,
    );
  }
}

// --- Forbidden content ---
const forbidden = [
  ...ALWAYS_FORBIDDEN_MODULES,
  ...(profile === 'production' ? PRODUCTION_FORBIDDEN_MODULES : []),
];
/** @type {Map<string, string[]>} */
const violations = new Map();
for (const chunk of report.chunks) {
  for (const module of Object.keys(chunk.modules)) {
    const rule = forbidden.find(({ pattern }) => pattern.test(module));
    if (!rule) continue;
    const found = violations.get(rule.reason) ?? [];
    found.push(`${module} (${chunk.fileName})`);
    violations.set(rule.reason, found);
  }
}
for (const [reason, modules] of violations) {
  const shown = modules.slice(0, 3).join(', ');
  const more = modules.length > 3 ? ` and ${modules.length - 3} more` : '';
  fail(`${reason} in the build: ${shown}${more}`);
}
const hasWorker = files.includes('mockServiceWorker.js');
if (profile === 'production' && hasWorker)
  fail('mockServiceWorker.js must not be in a real build.');
if (profile === 'demo' && !hasWorker)
  fail('Demo builds must emit mockServiceWorker.js.');
const sourceMaps = files.filter((file) => file.endsWith('.map'));
if (profile === 'production' && sourceMaps.length) {
  fail(`Source maps are published with the build: ${sourceMaps.join(', ')}`);
}

// --- Base path ---
const expectedBase = values.base ?? report.base;
if (report.base !== expectedBase) {
  fail(`Built with base "${report.base}", expected "${expectedBase}".`);
}
const html = readFileSync(join(outDir, 'index.html'), 'utf8');
const assetUrls = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
  .map((match) => match[1] ?? '')
  .filter((url) => url.includes('/assets/'));
for (const url of assetUrls) {
  if (!url.startsWith(`${expectedBase}assets/`)) {
    fail(
      `index.html references ${url} outside the base path "${expectedBase}".`,
    );
  }
}
if (!assetUrls.length) fail('index.html references no built assets.');

// --- Summary ---
console.log(
  `[check-build] ${dir} (profile: ${profile}, mode: ${report.mode}, base: ${report.base})`,
);
for (const [label, actual, limit] of budgetRows) {
  console.log(
    `  ${label.padEnd(48)} ${actual.toFixed(1).padStart(7)} kB gzip  (budget ${limit} kB)`,
  );
}
console.log(`  chunks: ${initial.size} initial, ${lazyChunks.length} lazy`);

if (failures.length) {
  console.error(`\n[check-build] FAILED (${failures.length}):`);
  for (const message of failures) console.error(`  ✗ ${message}`);
  process.exit(1);
}
console.log('[check-build] OK');
