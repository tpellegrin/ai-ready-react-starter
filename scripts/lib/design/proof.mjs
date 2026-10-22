// @ts-check
/**
 * The image-guided composition proof (`pnpm adopt:check --scenario design`),
 * run inside an adopted copy after demo and reference code are gone. It
 * replays, from fixtures in scripts/adoption/design, what an agent did with
 * two original reference sets (a sketched Expenses page, a high-fidelity
 * Pricing page) and checks every tool on the way:
 *
 * 1. `pnpm design init` copies the references and writes skeletons that are
 *    structurally valid but not ready (nothing interpreted);
 * 2. the generators scaffold the planned feature, components and pages,
 *    and the product code goes on top (scripts/lib/overlay.mjs: replaced
 *    generated files are checked by hash, so template changes fail here);
 * 3. the plans the agent wrote match the references init recorded and pass
 *    `pnpm design check --ready`;
 * 4. both tasks capture with every mechanical check passing; a scenario that
 *    never gets ready fails and says which condition;
 * 5. regression: missing baselines fail and nothing is written; `--update`
 *    writes them; a deliberate visual change fails the comparison.
 *
 * The adopted project's own verify (run by the caller) then validates the
 * product code, its unit and browser tests, budgets and the regression
 * step. Evidence is copied out for CI artifacts.
 */
import fs from 'node:fs';
import path from 'node:path';

import { planOverlay } from '../overlay.mjs';

/**
 * @typedef {{ dir: string, run: (command: string, args: string[], options?: { quiet?: boolean, env?: Record<string, string> }) => { status: number, output: string } }} Workspace
 * @typedef {{ step: (name: string, ok: boolean, detail?: string) => void }} Report
 */

/** @param {string} file @returns {unknown} */
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));

/** @param {string} dir @returns {string[]} */
const filesUnder = (dir) =>
  fs.existsSync(dir)
    ? fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const full = path.join(dir, entry.name);
        return entry.isDirectory() ? filesUnder(full) : [full];
      })
    : [];

/**
 * @param {{ projectRoot: string, workspace: Workspace, report: Report, name: string }} input
 */
export const runDesignProof = ({ projectRoot, workspace, report, name }) => {
  const fixtures = path.join(projectRoot, 'scripts/adoption/design');
  const ws = (/** @type {string} */ file) => path.join(workspace.dir, file);
  const design = (/** @type {string[]} */ args) =>
    workspace.run('node', ['scripts/design.mjs', ...args], { quiet: true });
  const tasks = fs.readdirSync(path.join(fixtures, 'tasks')).sort();
  const overlay = /** @type {import('../overlay.mjs').Overlay} */ (
    readJson(path.join(fixtures, 'overlay.json'))
  );

  // 1. References in, skeletons out.
  for (const task of tasks) {
    const inbox = ws(`inbox/${task}`);
    fs.mkdirSync(inbox, { recursive: true });
    const images = fs
      .readdirSync(path.join(fixtures, 'tasks', task, 'references'))
      .sort()
      .map((file) => {
        fs.copyFileSync(
          path.join(fixtures, 'tasks', task, 'references', file),
          path.join(inbox, file),
        );
        return path.join(inbox, file);
      });
    const init = design(['init', task, ...images]);
    const check = design(['check', task]);
    const ready = design(['check', task, '--ready']);
    report.step(
      `${name}: design init ${task}: references copied, a valid skeleton that is not ready`,
      init.status === 0 &&
        check.status === 0 &&
        ready.status === 1 &&
        /not ready to implement/.test(check.output),
      [init.output, check.output, ready.output].join('\n'),
    );
  }
  fs.rmSync(ws('inbox'), { recursive: true, force: true });

  // 2. Scaffold, then the product code on top.
  for (const args of overlay.generate ?? []) {
    const result = workspace.run('node', ['scripts/gen.mjs', ...args], {
      quiet: true,
    });
    report.step(
      `${name}: pnpm gen ${args.join(' ')}`,
      result.status === 0,
      result.output,
    );
  }
  const planned = planOverlay({
    root: workspace.dir,
    overlayDir: fixtures,
    overlay,
  });
  let written = /** @type {string[]} */ ([]);
  if (planned.write) written = planned.write().written;
  const formatted = [
    workspace.run('node', ['scripts/i18n-pseudo.mjs'], { quiet: true }),
    workspace.run(
      'prettier',
      ['--write', '--log-level=warn', ...written, 'src/i18n/locales'],
      { quiet: true },
    ),
  ];
  report.step(
    `${name}: product code on top of the generated code (hash-checked replacements, marker inserts, copy)`,
    !!planned.write && formatted.every((r) => r.status === 0),
    [...planned.problems, ...formatted.map((r) => r.output)].join('\n'),
  );

  // 3. The plans the agent wrote, against the references init recorded.
  for (const task of tasks) {
    const skeleton = /** @type {{ references: Array<{ sha256: string }> }} */ (
      readJson(ws(`design/${task}/plan.json`))
    );
    const plan = /** @type {{ references: Array<{ sha256: string }> }} */ (
      readJson(path.join(fixtures, 'tasks', task, 'plan.json'))
    );
    const hashes = (
      /** @type {{ references: Array<{ sha256: string }> }} */ p,
    ) =>
      p.references
        .map((r) => r.sha256)
        .sort()
        .join();
    fs.copyFileSync(
      path.join(fixtures, 'tasks', task, 'plan.json'),
      ws(`design/${task}/plan.json`),
    );
    report.step(
      `${name}: the ${task} plan describes the references init recorded`,
      hashes(skeleton) === hashes(plan),
    );
  }
  const ready = design(['check', '--all', '--ready']);
  report.step(
    `${name}: pnpm design check --all --ready`,
    ready.status === 0,
    ready.output,
  );

  // 4. Captures, and one that never gets ready.
  for (const task of tasks) {
    const capture = design(['capture', task, '--label', 'adoption-check']);
    const run = ws(`reports/design/${task}/adoption-check`);
    const evidence = ['report.html', 'report.json', 'summary.md'].every(
      (file) => fs.existsSync(path.join(run, file)),
    );
    report.step(
      `${name}: pnpm design capture ${task}: every mechanical check passes, evidence written`,
      capture.status === 0 && evidence,
      capture.output,
    );
  }
  const probe = ws('design/readiness-probe');
  fs.cpSync(ws(`design/${tasks[0] ?? ''}`), probe, { recursive: true });
  const probePlan =
    /** @type {{ task: string, captures: Array<Record<string, unknown>>, review: unknown }} */ (
      readJson(path.join(probe, 'plan.json'))
    );
  probePlan.task = 'readiness-probe';
  // Its own review would cite captures the probe does not have.
  probePlan.review = {
    rounds: [],
    best: null,
    remaining: [],
    human: { status: 'not-reviewed' },
  };
  probePlan.captures = [
    {
      ...probePlan.captures[0],
      id: 'never-ready',
      regression: false,
      timeoutMs: 1000,
      ready: [{ role: 'heading', level: 1, name: 'A heading no page has' }],
    },
  ];
  fs.writeFileSync(
    path.join(probe, 'plan.json'),
    `${JSON.stringify(probePlan, null, 2)}\n`,
  );
  const notReady = design(['capture', 'readiness-probe']);
  report.step(
    `${name}: a scenario that never gets ready fails and names the condition`,
    notReady.status === 1 &&
      /readiness condition not met: role=heading name="A heading no page has"/.test(
        notReady.output,
      ),
    notReady.output,
  );
  fs.rmSync(probe, { recursive: true, force: true });

  // 5. Regression baselines: missing, written on request, compared.
  const baselines = () =>
    tasks.flatMap((task) => filesUnder(ws(`design/${task}/baselines`)));
  const missing = design(['regress', '--all']);
  report.step(
    `${name}: pnpm design regress fails on missing baselines and writes none`,
    missing.status === 1 &&
      /no baseline at/.test(missing.output) &&
      baselines().length === 0,
    missing.output,
  );
  const update = design(['regress', '--all', '--update']);
  const expected = tasks.flatMap((task) =>
    /** @type {{ captures: Array<{ regression?: boolean }> }} */ (
      readJson(ws(`design/${task}/plan.json`))
    ).captures.filter((c) => c.regression),
  ).length;
  report.step(
    `${name}: pnpm design regress --update writes the ${expected} baselines`,
    update.status === 0 && baselines().length === expected,
    update.output,
  );
  const matched = design(['regress', '--all']);
  report.step(
    `${name}: the unchanged render matches its baselines`,
    matched.status === 0,
    matched.output,
  );
  const styles = ws(
    'src/features/expenses/components/ExpenseSummary/styles.ts',
  );
  const original = fs.readFileSync(styles, 'utf8');
  const changed = original.replace(
    'gap: ${({ theme }) => theme.spacers.md};',
    'gap: ${({ theme }) => theme.spacers.xxl};',
  );
  fs.writeFileSync(styles, changed);
  const regression = design(['regress', '--all']);
  fs.writeFileSync(styles, original);
  report.step(
    `${name}: a deliberate visual change (summary tile gap) fails the regression check`,
    changed !== original &&
      regression.status === 1 &&
      /differs from the reviewed baseline/.test(regression.output),
    regression.output,
  );

  // Evidence for CI artifacts, in a new folder of the caller's reports.
  const target = path.join(
    projectRoot,
    'reports/adoption/design',
    new Date().toISOString().replace(/[:.]/g, '-'),
  );
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.cpSync(ws('reports/design'), target, { recursive: true });
  return { evidence: path.relative(projectRoot, target) };
};
