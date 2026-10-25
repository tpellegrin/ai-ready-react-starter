#!/usr/bin/env node
// @ts-check
/**
 * Runs the repository's checks with concise output (`pnpm verify`,
 * `pnpm validate`). Steps live in scripts/lib/verify-steps.mjs.
 *
 *   pnpm verify                     everything CI runs
 *   pnpm validate                   the fast group (= pnpm verify --group validate)
 *   pnpm verify --affected [--base origin/main]
 *                                   conservative subset for the current diff
 *                                   (development only; not proof of merge readiness)
 *   options: --only <id> --skip <id> --bail --verbose --json --list
 *
 * Each step's full output goes to reports/verify/<id>.log; the terminal
 * shows one line per step and, for failures, the parsed diagnostics
 * (file:line rule message) or the log tail. reports/verify/report.json
 * always records every step (status, duration, log, diagnostics); --json
 * prints it instead of the summary. Exit code: 0 when every selected step
 * passed, 1 otherwise.
 *
 * Needs Playwright Chromium and WebKit for the Storybook and e2e steps
 * (`pnpm exec playwright install chromium webkit`) and network access for
 * the audit. The production build gets a placeholder VITE_API_BASE_URL when
 * none is set: verification checks that a real build works, not where it
 * deploys.
 *
 * Nested runs: `pnpm adopt:check` runs this script inside each adopted copy
 * with STARTER_NESTED_VERIFY=1, which skips `nested: false` steps (the
 * dependency audit). The adoption check is starter-only: adoption removes
 * its step, so verify → adopt:check → verify cannot recurse.
 */
import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { parseNameStatus, selectAffected } from './lib/affected.mjs';
import { formatDiagnostic, logTail, parsers } from './lib/diagnostics.mjs';
import { steps } from './lib/verify-steps.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const reportDir = path.join(root, 'reports/verify');
const MAX_SHOWN = 15;

const { values } = parseArgs({
  options: {
    group: { type: 'string' },
    only: { type: 'string', multiple: true, default: [] },
    skip: { type: 'string', multiple: true, default: [] },
    affected: { type: 'boolean', default: false },
    base: { type: 'string' },
    bail: { type: 'boolean', default: false },
    verbose: { type: 'boolean', default: false },
    json: { type: 'boolean', default: false },
    list: { type: 'boolean', default: false },
  },
});

const known = new Set(steps.map((s) => s.id));
const unknown = [...values.only, ...values.skip].filter((id) => !known.has(id));
if (unknown.length) {
  console.error(
    `[verify] Unknown step(s): ${unknown.join(', ')}. Run with --list.`,
  );
  process.exit(2);
}
if (values.list) {
  for (const step of steps) {
    const tag = step.group ? ` [${step.group}]` : '';
    console.log(`  ${step.id.padEnd(18)} pnpm ${step.script}${tag}`);
  }
  process.exit(0);
}

const nested = process.env.STARTER_NESTED_VERIFY === '1';

/** @type {Map<string, { reason: string, argv?: string[] | undefined }>} */
const selected = new Map();
/** @type {Map<string, string>} */
const skipReasons = new Map();
for (const step of steps) {
  if (values.group && step.group !== values.group) {
    skipReasons.set(step.id, `not in group "${values.group}"`);
  } else if (values.only.length && !values.only.includes(step.id)) {
    skipReasons.set(step.id, 'not selected (--only)');
  } else if (values.skip.includes(step.id)) {
    skipReasons.set(step.id, 'skipped (--skip)');
  } else if (nested && step.nested === false) {
    skipReasons.set(step.id, 'not run inside an adoption check copy');
  } else {
    selected.set(step.id, { reason: 'selected' });
  }
}

if (values.affected) {
  /** @param {string[]} args */
  const git = (args) =>
    execFileSync('git', args, { cwd: root, encoding: 'utf8' });
  let changes;
  try {
    changes = [
      ...parseNameStatus(git(['diff', '--name-status', '-M', 'HEAD'])),
      ...parseNameStatus(git(['diff', '--name-status', '-M', '--cached'])),
      ...git(['ls-files', '--others', '--exclude-standard'])
        .split('\n')
        .filter(Boolean)
        .map((file) => ({ status: /** @type {const} */ ('A'), path: file })),
      ...(values.base
        ? parseNameStatus(
            git(['diff', '--name-status', '-M', `${values.base}...HEAD`]),
          )
        : []),
    ];
  } catch (error) {
    console.error(
      `[verify] Could not read the diff (${error instanceof Error ? error.message.split('\n')[0] : 'git failed'}); running every selected step.`,
    );
    changes = null;
  }
  if (changes) {
    const selection = selectAffected(
      changes,
      steps.filter((step) => selected.has(step.id)),
      { existing: (file) => fs.existsSync(path.join(root, file)) },
    );
    console.log(
      `[verify] --affected${values.base ? ` (base ${values.base})` : ''}: ${selection.reasons.join('; ')}${selection.full ? ' → every step' : ''}`,
    );
    for (const id of [...selected.keys()]) {
      const choice = selection.selected.find((s) => s.id === id);
      if (choice)
        selected.set(id, { reason: choice.reason, argv: choice.argv });
      else {
        selected.delete(id);
        skipReasons.set(
          id,
          selection.skipped.find((s) => s.id === id)?.reason ?? 'not affected',
        );
      }
    }
    console.log(
      '[verify] Affected selection is for iteration only: run `pnpm verify` (CI) before merging.',
    );
  }
}

fs.rmSync(reportDir, { recursive: true, force: true });
fs.mkdirSync(reportDir, { recursive: true });

/** @param {string} value @param {string} artifact */
const fill = (value, artifact) => value.split('{artifact}').join(artifact);

/**
 * @param {string[]} argv
 * @param {Record<string, string>} env
 * @param {string} logFile
 * @returns {Promise<number>}
 */
const run = (argv, env, logFile) =>
  new Promise((resolve) => {
    const out = fs.createWriteStream(logFile);
    const child = spawn(
      process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm',
      argv,
      {
        cwd: root,
        env: { ...process.env, FORCE_COLOR: '0', ...env },
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );
    for (const stream of [child.stdout, child.stderr]) {
      stream.on('data', (/** @type {Buffer} */ chunk) => {
        out.write(chunk);
        if (values.verbose) process.stdout.write(chunk);
      });
    }
    child.on('close', (code) => out.end(() => resolve(code ?? 1)));
    child.on('error', (error) => {
      out.end(`\n[verify] Could not start pnpm: ${error.message}\n`);
      resolve(127);
    });
  });

/**
 * @typedef {{
 *   id: string, label: string, command: string,
 *   status: 'passed' | 'failed' | 'skipped', reason?: string,
 *   durationMs: number, log?: string,
 *   diagnostics: import('./lib/diagnostics.mjs').Diagnostic[], tail?: string[],
 * }} StepResult
 */
/** @type {StepResult[]} */
const results = [];
const startedAt = new Date();
const human = !values.json;
const rel = (/** @type {string} */ file) => path.relative(root, file);
let failed = false;

for (const step of steps) {
  const choice = selected.get(step.id);
  const dependencyFailed = (step.needs ?? []).find((id) =>
    results.some((r) => r.id === id && r.status !== 'passed'),
  );
  const skipReason = !choice
    ? skipReasons.get(step.id)
    : failed && values.bail
      ? 'an earlier step failed (--bail)'
      : dependencyFailed
        ? `needs "${dependencyFailed}", which did not pass`
        : undefined;
  if (skipReason) {
    results.push({
      id: step.id,
      label: step.label,
      command: `pnpm ${step.script}`,
      status: 'skipped',
      reason: skipReason,
      durationMs: 0,
      diagnostics: [],
    });
    continue;
  }

  const artifact = step.artifact ? path.join(reportDir, step.artifact) : '';
  const argv = (choice?.argv ?? [step.script, ...(step.args ?? [])]).map(
    (arg) => fill(arg, artifact),
  );
  const env = Object.fromEntries(
    Object.entries(step.env ?? {}).map(([k, v]) => [k, fill(v, artifact)]),
  );
  const logFile = path.join(reportDir, `${step.id}.log`);
  if (human) process.stdout.write(`▶ ${step.label} … `);
  const began = Date.now();
  const code = await run(argv, env, logFile);
  const durationMs = Date.now() - began;
  const status = code === 0 ? 'passed' : 'failed';
  const log = fs.readFileSync(logFile, 'utf8');
  const parse = step.parser ? parsers[step.parser] : undefined;
  const diagnostics =
    status === 'failed' && parse ? parse({ log, root, artifact }) : [];
  const tail =
    status === 'failed' && !diagnostics.length ? logTail(log) : undefined;
  results.push({
    id: step.id,
    label: step.label,
    command: `pnpm ${argv.join(' ')}`,
    status,
    ...(choice?.reason && choice.reason !== 'selected'
      ? { reason: choice.reason }
      : {}),
    durationMs,
    log: rel(logFile),
    diagnostics,
    ...(tail ? { tail } : {}),
  });
  if (status === 'failed') failed = true;

  if (!human) continue;
  const seconds = `${(durationMs / 1000).toFixed(1)}s`;
  if (status === 'passed') {
    console.log(`✓ ${seconds}`);
    continue;
  }
  console.log(
    `✗ ${seconds}${diagnostics.length ? ` (${diagnostics.length} problem${diagnostics.length > 1 ? 's' : ''})` : ''}`,
  );
  for (const diagnostic of diagnostics.slice(0, MAX_SHOWN)) {
    console.log(`    ${step.id}: ${formatDiagnostic(diagnostic)}`);
  }
  if (diagnostics.length > MAX_SHOWN) {
    console.log(
      `    … ${diagnostics.length - MAX_SHOWN} more in reports/verify/report.json`,
    );
  }
  for (const line of tail ?? []) console.log(`    | ${line}`);
  console.log(
    `    full log: ${rel(logFile)}  (re-run: pnpm ${argv.map((arg) => arg.split(`${root}/`).join('')).join(' ')})`,
  );
}

const report = {
  ok: !failed,
  startedAt: startedAt.toISOString(),
  durationMs: Date.now() - startedAt.getTime(),
  steps: results,
};
const reportFile = path.join(reportDir, 'report.json');
fs.writeFileSync(reportFile, `${JSON.stringify(report, null, 2)}\n`);

if (values.json) {
  console.log(JSON.stringify(report, null, 2));
} else {
  const ran = results.filter((r) => r.status !== 'skipped');
  const skipped = results.filter((r) => r.status === 'skipped');
  const failures = results.filter((r) => r.status === 'failed');
  console.log(
    `\n[verify] ${failed ? `✗ ${failures.length} failed: ${failures.map((r) => r.id).join(', ')}` : '✓ all passed'} — ${ran.length} ran in ${(report.durationMs / 1000).toFixed(1)}s, ${skipped.length} skipped. Report: ${rel(reportFile)}`,
  );
  if (skipped.length && (values.affected || values.only.length || nested)) {
    for (const r of skipped) console.log(`    - ${r.id}: ${r.reason ?? ''}`);
  }
}
process.exit(failed ? 1 : 0);
