#!/usr/bin/env node
// @ts-check
/**
 * Image-guided composition (`pnpm design`): the deterministic half of
 * building pages from screenshots, wireframes or sketches. The agent looks
 * at the images and writes the plan and the code; these commands prepare,
 * validate, capture and report (docs/recipes/compose-from-images.md).
 *
 *   pnpm design init <task> [image…] [--title <text>]
 *       Copies PNG/JPEG references into design/<task>/references/ (never
 *       overwriting) and writes a plan skeleton with their facts (format,
 *       pixel size, sha256). It does not interpret the images. When the
 *       plan exists it only copies new images and prints their entries.
 *   pnpm design check [<task>…] [--all] [--ready] [--summary] [--json]
 *       Read-only. Validates plans: schema, references (present, unchanged),
 *       ids and cross-references, component mappings against the public
 *       exports, planned names and routes, capture scenarios. Open items
 *       are fine while exploring; --ready fails on them too.
 *   pnpm design capture <task> [--scenario <id>]… [--label <name>] [--json]
 *       Renders the task's capture scenarios (production build, declared
 *       API responses, explicit readiness) and writes screenshots, region
 *       measurements, axe results, environment and a comparison report to a
 *       new reports/design/<task>/<label>/.
 *   pnpm design regress [<task>…] [--all] [--update] [--label <name>] [--json]
 *       Compares `regression: true` scenarios with reviewed baselines in
 *       design/<task>/baselines/ (Playwright screenshots, default
 *       thresholds). Missing baselines fail; --update writes them, for
 *       review.
 *
 * Exit codes: 0 success, 1 problems found, 2 usage or unsafe output.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { loadCatalog } from './lib/catalog.mjs';
import { runScenarios } from './lib/design/capture.mjs';
import { checkTask, listTasks } from './lib/design/check.mjs';
import { initTask } from './lib/design/init.mjs';
import { DESIGN_DIR, taskPaths } from './lib/design/plan.mjs';
import { planSummary } from './lib/design/report.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const usage = `Usage:
  pnpm design init <task> [image…] [--title <text>]
  pnpm design check [<task>…] [--all] [--ready] [--summary] [--json]
  pnpm design capture <task> [--scenario <id>]… [--label <name>] [--json]
  pnpm design regress [<task>…] [--all] [--update] [--label <name>] [--json]
Recipe: docs/recipes/compose-from-images.md`;

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    all: { type: 'boolean', default: false },
    ready: { type: 'boolean', default: false },
    summary: { type: 'boolean', default: false },
    json: { type: 'boolean', default: false },
    update: { type: 'boolean', default: false },
    title: { type: 'string' },
    label: { type: 'string' },
    scenario: { type: 'string', multiple: true, default: [] },
    help: { type: 'boolean', default: false },
  },
});
const [command = '', ...args] = positionals;

/** @param {string} message @returns {never} */
const usageError = (message) => {
  console.error(`[design] ${message}\n\n${usage}`);
  process.exit(2);
};

if (values.help) {
  console.log(usage);
  process.exit(0);
}

/** @type {import('./lib/catalog.mjs').Entry[] | null} */
let catalogEntries = null;
const catalog = () => (catalogEntries ??= loadCatalog(root));

const LEVEL_MARK = { error: '✗', warning: '⚠', open: '○' };
const DISCLAIMER =
  'This checks facts about the plan; it does not show that the page matches the references, and it is not a design approval.';

/** @param {string[]} names */
const tasksFrom = (names) => {
  if (values.all) return listTasks(root);
  if (!names.length) usageError('Name a task (design/<task>) or pass --all.');
  return names;
};

/** @param {ReturnType<typeof checkTask>} result */
const printCheck = (result) => {
  const errors = result.diagnostics.filter((d) => d.level === 'error').length;
  const open = result.diagnostics.filter((d) => d.level === 'open').length;
  console.log(
    `${result.ok ? '✓' : '✗'} ${result.file}: ${result.ok ? 'structure valid' : `${errors} error(s)`}; ${result.ready ? 'no open items' : `${open} open item(s), not ready to implement`}`,
  );
  for (const d of result.diagnostics) {
    console.log(
      `${LEVEL_MARK[d.level]} ${d.file}:${d.line ?? 1} ${d.path ? `${d.path}: ` : ''}${d.message}`,
    );
  }
};

/** @param {string[]} names */
const check = (names) => {
  const tasks = tasksFrom(names);
  if (!tasks.length) {
    if (values.json) console.log(JSON.stringify({ ok: true, tasks: [] }));
    else
      console.log(`[design] No design tasks (${DESIGN_DIR}/<task>/plan.json).`);
    return 0;
  }
  const results = tasks.map((task) => checkTask(root, task, { catalog }));
  const failed = results.some((r) => !r.ok || (values.ready && !r.ready));
  if (values.json) {
    console.log(
      JSON.stringify(
        {
          ok: !failed,
          tasks: results.map(({ plan: _plan, ...rest }) => rest),
        },
        null,
        2,
      ),
    );
  } else if (values.summary) {
    for (const result of results) {
      if (result.plan) console.log(planSummary(result.plan, result));
      else printCheck(result);
    }
  } else {
    for (const result of results) printCheck(result);
    console.log(`\n[design] ${DISCLAIMER}`);
  }
  return failed ? 1 : 0;
};

/** @param {string[]} input */
const init = async (input) => {
  const [task = '', ...images] = input;
  if (!task) {
    usageError(
      'init needs a task name, e.g. `pnpm design init expense-overview shot.png`.',
    );
  }
  const result = await initTask({ root, task, images, title: values.title });
  if (!result.ok) {
    console.error(
      `[design] Nothing was written:\n${result.problems.map((p) => `  ✗ ${p}`).join('\n')}`,
    );
    return 1;
  }
  for (const file of result.copied) console.log(`  copy    ${file}`);
  const paths = taskPaths(task);
  if (!result.created) {
    console.log(
      `[design] ${paths.plan} exists and was not changed. ${result.pending.length ? 'Add these entries to its "references" after looking at the images:' : 'Every image is already registered.'}`,
    );
    if (result.pending.length) {
      console.log(JSON.stringify(result.pending, null, 2));
    }
    return 0;
  }
  console.log(
    `  create  ${result.created} (reference facts only; nothing interpreted)`,
  );
  console.log(`[design] Next (docs/recipes/compose-from-images.md):
  1. Open every image in ${paths.references}/ and record what it is: kind, role,
     screen/state, viewport.
  2. Describe screens, states and regions; map regions with \`pnpm catalog\`;
     record questions, assumptions and deviations.
  3. pnpm design check ${task}   (add --ready before implementing)`);
  return 0;
};

/** @param {'capture' | 'regression'} mode @param {string[]} names */
const capture = (mode, names) => {
  const tasks = mode === 'capture' ? names : tasksFrom(names);
  if (mode === 'capture' && tasks.length !== 1) {
    usageError('capture takes exactly one task.');
  }
  if (
    values.label !== undefined &&
    !/^[a-z0-9][a-z0-9-]{0,40}$/.test(values.label)
  ) {
    usageError(
      '--label is lowercase letters, digits and dashes (e.g. round-1).',
    );
  }
  if (!tasks.length) {
    console.log(`[design] No design tasks (${DESIGN_DIR}/<task>/plan.json).`);
    return 0;
  }
  const checked = tasks.map((task) => checkTask(root, task, { catalog }));
  const broken = checked.filter((r) => !r.ok);
  if (broken.length) {
    for (const result of broken) printCheck(result);
    console.error('\n[design] Fix the plan first: nothing was captured.');
    return 1;
  }
  /** @type {ReturnType<typeof runScenarios>} */
  let outcome;
  try {
    outcome = runScenarios({
      root,
      plans: checked.map((r) => ({
        plan: /** @type {import('./lib/design/plan.mjs').Plan} */ (r.plan),
        source: fs.readFileSync(path.join(root, r.file), 'utf8'),
      })),
      mode,
      label: values.label,
      scenarioIds: values.scenario,
      update: values.update,
    });
  } catch (error) {
    console.error(
      `[design] ${error instanceof Error ? error.message : String(error)}`,
    );
    return 2;
  }
  if (values.json) {
    console.log(
      JSON.stringify(
        { ok: outcome.ok, runs: outcome.runs.map((r) => r.report) },
        null,
        2,
      ),
    );
    return outcome.ok ? 0 : 1;
  }
  for (const { report } of outcome.runs) {
    for (const scenario of report.scenarios) {
      const geometry = scenario.geometry;
      const facts = [
        scenario.status,
        geometry &&
          `regions ${geometry.regions.filter((r) => r.status === 'found').length}/${geometry.regions.filter((r) => r.status !== 'not-measured').length}`,
        geometry &&
          `arrangement mismatches ${geometry.relations.filter((r) => r.status === 'mismatch').length}`,
        scenario.a11y && `axe violations ${scenario.a11y.length}`,
      ].filter(Boolean);
      const ok =
        !scenario.failures.length &&
        ['captured', 'matched'].includes(scenario.status);
      console.log(
        `${ok ? '✓' : '✗'} ${report.task}/${scenario.id}: ${facts.join(' · ')}`,
      );
      for (const failure of scenario.failures) console.log(`    ${failure}`);
    }
  }
  for (const message of outcome.messages) console.log(`[design] ${message}`);
  if (mode === 'regression' && values.update && outcome.runs.length) {
    console.log(
      `[design] Baselines were written for ${process.platform}. Review them (git diff) and commit them; they are compared on this platform only.`,
    );
  }
  if (mode === 'capture') {
    console.log(
      "[design] Mechanical results only: compare the renders with the references yourself and record what you see in the plan's review.",
    );
  }
  return outcome.ok ? 0 : 1;
};

const commands = {
  init: () => init(args),
  check: () => check(args),
  capture: () => capture('capture', args),
  regress: () => capture('regression', args),
};
if (!(command in commands))
  usageError(command ? `Unknown command "${command}".` : 'Name a command.');
process.exitCode =
  await commands[/** @type {keyof typeof commands} */ (command)]();
