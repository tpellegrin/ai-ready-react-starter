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
 * 4. both tasks capture with every mechanical check passing, every
 *    screenshot at the requested viewport and the whole content reached by
 *    scrolling; a scenario that never gets ready fails and says which
 *    condition; an unexpected console error fails a capture;
 * 5. regression: missing baselines fail and nothing is written; `--update`
 *    writes them; a deliberate visual change fails the comparison;
 * 6. the screenshot set: a page that loses its lower sections (three
 *    screenshots to one, the first unchanged) fails and changes no
 *    baseline; `--update` removes exactly the two no longer produced, the
 *    next run passes, and other scenarios', browsers', platforms' and
 *    tasks' baselines stay as they were.
 *
 * The adopted project's own verify (run by the caller) then validates the
 * product code, its unit and browser tests, budgets and the regression
 * step. Evidence is copied out for CI artifacts.
 */
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { planOverlay } from '../overlay.mjs';
import { readImageInfo } from './images.mjs';
import { resolveInside } from './output.mjs';

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
 * What a capture run's evidence says about its viewport: every screenshot
 * has the requested size (it was never resized) and scroll extents reached
 * the end. Returns the problems.
 * @param {string} runDir
 * @param {string} planFile
 * @returns {string[]}
 */
const viewportProblems = (runDir, planFile) => {
  const plan =
    /** @type {{ captures: Array<{ id: string, viewport: { width: number, height: number }, deviceScaleFactor?: number, extent?: string }> }} */ (
      readJson(planFile)
    );
  const report =
    /** @type {{ scenarios: Array<{ id: string, screenshots: Array<{ file: string }>, extent?: { kind: string, complete?: boolean } }> }} */ (
      readJson(path.join(runDir, 'report.json'))
    );
  return report.scenarios.flatMap((scenario) => {
    const capture = plan.captures.find((c) => c.id === scenario.id);
    if (!capture) return [`${scenario.id}: not in the plan`];
    const scale = capture.deviceScaleFactor ?? 1;
    const expected = `${capture.viewport.width * scale}×${capture.viewport.height * scale}`;
    const sizes = scenario.screenshots.map((shot) => {
      const info = readImageInfo(fs.readFileSync(path.join(runDir, shot.file)));
      return info ? `${info.width}×${info.height}` : `${shot.file}: not a PNG`;
    });
    return [
      ...(sizes.length ? [] : [`${scenario.id}: no screenshots`]),
      ...sizes
        .filter((size) => size !== expected)
        .map((size) => `${scenario.id}: a ${size} screenshot, not ${expected}`),
      ...(capture.extent === 'scroll' &&
      !(scenario.extent?.kind === 'scroll' && scenario.extent.complete)
        ? [`${scenario.id}: the scroll extent did not reach the end`]
        : []),
    ];
  });
};

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

  // 4. Captures at the requested viewport, one that never gets ready and
  // one with a console error.
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
    const problems = evidence
      ? viewportProblems(run, ws(`design/${task}/plan.json`))
      : ['no report'];
    report.step(
      `${name}: ${task}: every screenshot at the requested viewport, scrolled content reached to its end`,
      problems.length === 0,
      problems.join('\n'),
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

  // A console error fails the browser test in teardown, after the scenario
  // recorded its result: the capture must still fail, keeping the screenshot.
  const view = ws('src/views/guest/Pricing/index.tsx');
  const source = fs.readFileSync(view, 'utf8');
  const anchor = 'export function Pricing() {';
  fs.writeFileSync(
    view,
    source.replace(
      anchor,
      `${anchor}\n  console.error('design probe: an unexpected console error');`,
    ),
  );
  const noisy = design([
    'capture',
    'pricing',
    '--scenario',
    'desktop',
    '--label',
    'console-error-probe',
  ]);
  fs.writeFileSync(view, source);
  const noisyRun = ws('reports/design/pricing/console-error-probe');
  const noisyScenario = fs.existsSync(path.join(noisyRun, 'report.json'))
    ? /** @type {{ ok: boolean, scenarios: Array<{ status: string, screenshot?: string }> }} */ (
        readJson(path.join(noisyRun, 'report.json'))
      )
    : null;
  report.step(
    `${name}: an unexpected console error fails the capture, and the screenshot is kept`,
    source.includes(anchor) &&
      noisy.status === 1 &&
      /console: design probe: an unexpected console error/.test(noisy.output) &&
      noisyScenario?.ok === false &&
      noisyScenario.scenarios[0]?.status === 'failed' &&
      !!noisyScenario.scenarios[0].screenshot &&
      fs.existsSync(path.join(noisyRun, noisyScenario.scenarios[0].screenshot)),
    noisy.output,
  );

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
  const update = design(['regress', '--all', '--update', '--label', 'update']);
  // One baseline per screenshot, as the report lists them (scroll positions
  // after the first are <id>--scroll-<n>).
  const updateReport = ws('reports/design/_regression/update/report.json');
  const listed = (
    fs.existsSync(updateReport)
      ? /** @type {Array<{ scenarios: Array<{ baselines?: string[] }> }>} */ (
          readJson(updateReport)
        )
      : []
  )
    .flatMap((r) => r.scenarios.flatMap((s) => s.baselines ?? []))
    .sort();
  const onDisk = baselines()
    .map((file) => path.relative(workspace.dir, file))
    .sort();
  report.step(
    `${name}: pnpm design regress --update writes the ${listed.length} baselines its report lists`,
    update.status === 0 && listed.length > 0 && onDisk.join() === listed.join(),
    [update.output, ...onDisk].join('\n'),
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
      /screenshot\(s\) differ from the reviewed baselines/.test(
        regression.output,
      ),
    regression.output,
  );

  // 6. The screenshot set, on the Pricing page at a tall phone viewport
  // (phone emulation: no scrollbar to tell the renders apart). With
  // sections appended below the fold it needs three screenshots; without
  // them one, and that one looks the same.
  const setTask = 'set-probe';
  const setDir = ws(`design/${setTask}`);
  fs.cpSync(ws('design/pricing'), setDir, { recursive: true });
  fs.rmSync(path.join(setDir, 'baselines'), { recursive: true, force: true });
  const setPlan =
    /** @type {{ task: string, captures: Array<Record<string, unknown>>, review: unknown }} */ (
      readJson(path.join(setDir, 'plan.json'))
    );
  const { compare: _compare, ...pricingCapture } = setPlan.captures[0] ?? {};
  setPlan.task = setTask;
  setPlan.review = {
    rounds: [],
    best: null,
    remaining: [],
    human: { status: 'not-reviewed' },
  };
  setPlan.captures = [
    {
      ...pricingCapture,
      id: 'tall',
      viewport: { width: 390, height: 1700 },
      deviceScaleFactor: 1,
      mobile: true,
      extent: 'scroll',
      regression: true,
    },
    {
      ...pricingCapture,
      id: 'top',
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 1,
      mobile: true,
      extent: 'viewport',
      regression: true,
    },
  ];
  fs.writeFileSync(
    path.join(setDir, 'plan.json'),
    `${JSON.stringify(setPlan, null, 2)}\n`,
  );
  const platform = process.platform;
  const setBaseline = (/** @type {string} */ name) =>
    `design/${setTask}/baselines/${name}`;
  const tall = [0, 1, 2].map((n) =>
    setBaseline(`tall${n ? `--scroll-${n}` : ''}-chromium-${platform}.png`),
  );
  // Not tall's on this browser and platform: they must stay as they are.
  const unrelated = [
    setBaseline(`top-chromium-${platform}.png`),
    setBaseline(`tall--scroll-1-webkit-${platform}.png`),
    setBaseline(
      `tall--scroll-1-chromium-${platform === 'linux' ? 'darwin' : 'linux'}.png`,
    ),
    ...tasks.flatMap((task) =>
      filesUnder(ws(`design/${task}/baselines`)).map((file) =>
        path.relative(workspace.dir, file),
      ),
    ),
  ];
  /** sha256 of each file that exists, by project-relative path. */
  const hashes = (/** @type {string[]} */ files) =>
    Object.fromEntries(
      files
        .filter((file) => fs.existsSync(ws(file)))
        .map((file) => [
          file,
          createHash('sha256')
            .update(fs.readFileSync(ws(file)))
            .digest('hex'),
        ]),
    );
  const scenarioOf = (
    /** @type {string} */ label,
    /** @type {string} */ id,
  ) => {
    const file = ws(`reports/design/_regression/${label}/report.json`);
    if (!fs.existsSync(file)) return null;
    const run =
      /** @type {{ scenarios: Array<{ id: string, status: string, failures: string[], screenshotSet?: { produced: string[], disappeared: string[], removed?: string[] } }> }} */ (
        readJson(file)
      );
    return run.scenarios.find((s) => s.id === id) ?? null;
  };

  const sections = Array.from(
    { length: 12 },
    (_, n) =>
      `<p key="${n}" style={{ height: 200, margin: 0 }}>Section ${n + 1}</p>`,
  ).join('');
  const footnoteEnd = '</_PricingContent>';
  fs.writeFileSync(
    view,
    source.replace(
      footnoteEnd,
      `<section aria-label="More" style={{ marginTop: 160 }}>${sections}</section>${footnoteEnd}`,
    ),
  );
  const long = design(['regress', setTask, '--update', '--label', 'set-long']);
  fs.writeFileSync(view, source);
  // Fakes of another browser and platform, written like reviewed ones.
  for (const file of unrelated.slice(1, 3)) {
    fs.copyFileSync(ws(tall[1] ?? ''), ws(file));
  }
  report.step(
    `${name}: the long page's reviewed set: 3 screenshots of "tall", 1 of "top"`,
    source.includes(footnoteEnd) &&
      long.status === 0 &&
      Object.keys(hashes([...tall, ...unrelated.slice(0, 3)])).length === 6,
    long.output,
  );

  const before = hashes([...tall, ...unrelated]);
  const shortened = design(['regress', setTask, '--label', 'set-short']);
  const short = scenarioOf('set-short', 'tall');
  report.step(
    `${name}: the shortened page (3 screenshots to 1, the first matching) fails because 2 reviewed screenshots disappeared, and no baseline changes`,
    shortened.status === 1 &&
      short?.status === 'different' &&
      short.failures.length === 1 &&
      /^screenshot set changed: 2 reviewed screenshot\(s\) no longer produced/.test(
        short.failures[0] ?? '',
      ) &&
      short.screenshotSet?.produced.length === 1 &&
      scenarioOf('set-short', 'top')?.status === 'matched' &&
      JSON.stringify(hashes([...tall, ...unrelated])) ===
        JSON.stringify(before),
    shortened.output,
  );

  const reconciled = design([
    'regress',
    setTask,
    '--update',
    '--label',
    'set-update',
  ]);
  const after = hashes([...tall, ...unrelated]);
  report.step(
    `${name}: --update removes exactly tall's 2 baselines no longer produced; every other baseline stays`,
    reconciled.status === 0 &&
      JSON.stringify(
        scenarioOf('set-update', 'tall')?.screenshotSet?.removed,
      ) === JSON.stringify(tall.slice(1)) &&
      Object.keys(after).join() === [tall[0], ...unrelated].join() &&
      unrelated.every((file) => after[file] === before[file]),
    reconciled.output,
  );
  const again = design(['regress', setTask, '--label', 'set-again']);
  report.step(
    `${name}: the next run of the shortened page passes`,
    again.status === 0,
    again.output,
  );
  fs.rmSync(setDir, { recursive: true, force: true });

  // Evidence for CI artifacts, in a new folder of the caller's reports.
  const relative = `reports/adoption/design/${new Date().toISOString().replace(/[:.]/g, '-')}`;
  const target = resolveInside(projectRoot, 'reports', relative);
  if (fs.existsSync(target)) throw new Error(`${relative} already exists`);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.cpSync(ws('reports/design'), target, { recursive: true });
  return { evidence: relative };
};
