// @ts-check
/**
 * Runs a plan's capture scenarios in a real browser and turns the results
 * into evidence (`pnpm design capture` / `pnpm design regress`).
 *
 * The browser work is a Playwright spec (e2e/design/capture.spec.ts, config
 * playwright.design.config.ts) against a fresh production build with the
 * API answered only by each scenario's declared responses. This module
 * prepares its input (a manifest in a new run folder under
 * reports/design/), starts it, and reads what it wrote back. Starting
 * Playwright goes through an injectable `spawn`, so failures to start, to
 * get ready or to produce results are tested without a browser.
 *
 * - capture: screenshots, measured region boxes, axe results and the
 *   environment of every scenario; the comparison with the references.
 * - regression: each `regression: true` scenario against its reviewed
 *   baseline in design/<task>/baselines/ with Playwright's own screenshot
 *   comparison and default thresholds. Missing baselines fail and are not
 *   written; `--update` (explicit) writes them for review.
 */
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import { stripAnsi } from '../diagnostics.mjs';
import { compareGeometry } from './geometry.mjs';
import { createRunDir } from './output.mjs';
import {
  describeMapping,
  indexHtml,
  runReportHtml,
  runSummaryMarkdown,
} from './report.mjs';
import { taskPaths } from './plan.mjs';

/**
 * @typedef {import('./plan.mjs').Plan} Plan
 * @typedef {import('./plan.mjs').Capture} Capture
 * @typedef {import('./report.mjs').ScenarioResult} ScenarioResult
 * @typedef {import('./report.mjs').RunReport} RunReport
 * @typedef {'capture' | 'regression'} Mode
 * @typedef {{
 *   task: string, id: string, screen: string, state: string, route: string,
 *   browser: Capture['browser'], viewport: Capture['viewport'],
 *   deviceScaleFactor: number, mobile: boolean, locale: string,
 *   colorScheme: Capture['colorScheme'], reducedMotion: Capture['reducedMotion'],
 *   fullPage: boolean, session: Capture['session'], api: Capture['api'],
 *   steps: Capture['steps'], ready: Capture['ready'], timeoutMs: number,
 *   regions: Array<{ id: string, label: string, locator: import('./plan.mjs').Locator }>,
 *   output: { screenshot: string, result: string },
 *   baseline: string[] | null,
 * }} ManifestScenario
 * @typedef {{ mode: Mode, runDir: string, scenarios: ManifestScenario[] }} Manifest
 * @typedef {{ status: number | null, error?: Error | undefined, stdout?: string | null, stderr?: string | null }} SpawnResult
 * @typedef {(command: string, args: string[], options: { cwd: string, env: NodeJS.ProcessEnv, encoding: 'utf8', maxBuffer: number }) => SpawnResult} Spawn
 */

const CONFIG_FILE = 'playwright.design.config.ts';

/** Node's spawnSync, typed as the subset used here. */
const defaultSpawn = /** @type {Spawn} */ (/** @type {unknown} */ (spawnSync));

/** The commit evidence was produced from, and whether the tree was dirty. */
const revisionOf = (/** @type {string} */ root, spawn = defaultSpawn) => {
  const git = (/** @type {string[]} */ args) =>
    spawn('git', args, {
      cwd: root,
      env: process.env,
      encoding: 'utf8',
      maxBuffer: 1024 * 1024 * 16,
    });
  const head = git(['rev-parse', 'HEAD']);
  if (head.status !== 0) return { commit: null, uncommittedChanges: false };
  const status = git(['status', '--porcelain']);
  return {
    commit: String(head.stdout ?? '').trim() || null,
    uncommittedChanges: String(status.stdout ?? '').trim() !== '',
  };
};

/**
 * The scenarios to run, resolved from the plan.
 * @param {{ plan: Plan, captures: Capture[], runDir: string, mode: Mode }} input
 * @returns {ManifestScenario[]}
 */
const manifestScenarios = ({ plan, captures, runDir, mode }) =>
  captures.map((capture) => {
    const screen = plan.screens.find((s) => s.id === capture.screen);
    if (!screen) throw new Error(`capture ${capture.id}: unknown screen`);
    const regions = screen.regions
      .filter(
        (region) =>
          region.locator &&
          (!region.states || region.states.includes(capture.state)),
      )
      .map((region) => ({
        id: region.id,
        label: region.label,
        locator: /** @type {import('./plan.mjs').Locator} */ (region.locator),
      }));
    const prefix = `${plan.task}--${capture.id}`;
    return {
      task: plan.task,
      id: capture.id,
      screen: capture.screen,
      state: capture.state,
      route: capture.path ?? screen.route.path,
      browser: capture.browser,
      viewport: capture.viewport,
      deviceScaleFactor: capture.deviceScaleFactor,
      mobile: capture.mobile,
      locale: capture.locale,
      colorScheme: capture.colorScheme,
      reducedMotion: capture.reducedMotion,
      fullPage: capture.fullPage,
      session: capture.session,
      api: capture.api,
      steps: capture.steps,
      ready: capture.ready,
      timeoutMs: capture.timeoutMs,
      regions,
      output: {
        screenshot: path.join(runDir, 'captures', `${prefix}.png`),
        result: path.join(runDir, 'results', `${prefix}.json`),
      },
      baseline:
        mode === 'regression'
          ? [plan.task, 'baselines', `${capture.id}.png`]
          : null,
    };
  });

/**
 * Starts Playwright on the design config. Never throws: a failure to start
 * comes back as `startError`.
 * @param {{ root: string, manifestFile: string, runDir: string, projects: string[], update: boolean, spawn?: Spawn }} input
 */
export const runPlaywright = ({
  root,
  manifestFile,
  runDir,
  projects,
  update,
  spawn = defaultSpawn,
}) => {
  const bin = path.join(root, 'node_modules/.bin/playwright');
  const args = [
    'test',
    '--config',
    CONFIG_FILE,
    ...projects.map((project) => `--project=${project}`),
    ...(update ? ['--update-snapshots=all'] : []),
  ];
  const result = spawn(bin, args, {
    cwd: root,
    env: {
      ...process.env,
      // The web server runs `vite`; pnpm puts it on PATH, `node` alone does not.
      PATH: [path.join(root, 'node_modules/.bin'), process.env.PATH ?? ''].join(
        path.delimiter,
      ),
      FORCE_COLOR: '0',
      DESIGN_MANIFEST: manifestFile,
      DESIGN_OUTPUT_DIR: path.join(runDir, 'playwright'),
      PLAYWRIGHT_JSON_OUTPUT_FILE: path.join(runDir, 'playwright.json'),
    },
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 64,
  });
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
  fs.writeFileSync(path.join(runDir, 'playwright.log'), output);
  if (result.error) {
    return {
      status: 1,
      output,
      startError: `could not start Playwright (${bin}): ${result.error.message}`,
    };
  }
  return { status: result.status ?? 1, output, startError: null };
};

/**
 * What a failed screenshot comparison means.
 * @param {string} message  Playwright's error message
 * @returns {'missing' | 'different' | 'failed'}
 */
export const classifyRegression = (message) => {
  if (/A snapshot doesn't exist at /.test(message)) return 'missing';
  if (
    /Screenshot comparison failed|pixels? \(ratio [\d.]+ of all image pixels\) (?:are|is) different|Expected an image \d+px by \d+px, received/.test(
      message,
    )
  ) {
    return 'different';
  }
  return 'failed';
};

/** @param {string} file @returns {unknown} */
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));

/**
 * The last lines of Playwright's output, for failures without a result.
 * @param {string} output
 */
const tail = (output, lines = 12) =>
  stripAnsi(output)
    .split('\n')
    .filter((line) => line.trim())
    .slice(-lines)
    .join('\n');

/**
 * @typedef {{
 *   status: 'captured' | 'failed', phase?: string, error?: string,
 *   frame?: { width: number, height: number },
 *   environment?: Record<string, unknown>,
 *   regions?: Array<{ id: string, found: boolean, visible: boolean, count: number, box: { x: number, y: number, width: number, height: number } | null }>,
 *   a11y?: Array<{ id: string, impact: string, help: string, targets: string[] }>,
 *   unexpectedRequests?: string[],
 *   regression?: { error: string | null },
 * }} SpecResult  written by e2e/design/capture.spec.ts
 */

/**
 * Playwright's expected/actual/diff images of a failed baseline comparison
 * (relative to the run folder), if it wrote them.
 * @param {string} runDir
 * @param {ManifestScenario} scenario
 */
const comparisonImages = (runDir, scenario) => {
  const output = path.join(runDir, 'playwright');
  if (!fs.existsSync(output)) return null;
  const suffix = path.join(scenario.task, 'baselines', scenario.id);
  /** @type {Record<string, string>} */
  const found = {};
  /** @param {string} dir */
  const visit = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) visit(full);
      for (const kind of ['expected', 'actual', 'diff']) {
        if (full.endsWith(`${suffix}-${kind}.png`)) {
          found[kind] = path.relative(runDir, full);
        }
      }
    }
  };
  visit(output);
  return Object.keys(found).length ? found : null;
};

/**
 * Turns what the spec wrote (or did not write) into a scenario result.
 * @param {{ plan: Plan, scenario: ManifestScenario, result: SpecResult | null, runDir: string, mode: Mode, playwright: { output: string, startError: string | null } }} input
 * @returns {ScenarioResult}
 */
const scenarioResult = ({
  plan,
  scenario,
  result,
  runDir,
  mode,
  playwright,
}) => {
  const capture = plan.captures.find((c) => c.id === scenario.id);
  const screen = plan.screens.find((s) => s.id === scenario.screen);
  const compare = capture?.compare ?? null;
  const reference = compare
    ? plan.references.find((r) => r.id === compare)
    : undefined;
  const base = {
    id: scenario.id,
    screen: scenario.screen,
    state: scenario.state,
    compare,
  };
  if (!result) {
    const said = stripAnsi(playwright.output)
      .split('\n')
      .find((line) => /error/i.test(line))
      ?.trim();
    return {
      ...base,
      status: 'failed',
      error:
        playwright.startError ??
        `No result was written for this scenario. Playwright said:\n${tail(playwright.output)}`,
      failures: [
        playwright.startError ??
          `the scenario did not run to completion${said ? `: ${said}` : ''}`,
      ],
    };
  }
  /** @type {string[]} */
  const failures = [];
  if (result.status === 'failed') {
    failures.push(
      `${result.phase ?? 'capture'} failed: ${result.error ?? 'unknown error'}`,
    );
  }
  for (const request of result.unexpectedRequests ?? []) {
    failures.push(
      `undeclared request ${request}: declare it in the capture's "api"`,
    );
  }
  if (result.a11y?.length) {
    failures.push(
      `${result.a11y.length} accessibility violation(s): ${result.a11y.map((v) => v.id).join(', ')}`,
    );
  }
  const frame = result.frame;
  const measured = new Map((result.regions ?? []).map((r) => [r.id, r]));
  const regions = (screen?.regions ?? [])
    .filter(
      (region) =>
        region.component?.use !== 'omitted' &&
        (!region.states || region.states.includes(scenario.state)),
    )
    .map((region) => {
      const box = compare ? region.bounds?.[compare] : undefined;
      return {
        id: region.id,
        label: region.label,
        parent: region.parent,
        mapping: describeMapping(region.component),
        reference: box
          ? { x: box[0], y: box[1], width: box[2], height: box[3] }
          : null,
        measured: measured.get(region.id) ?? null,
        deviation: plan.deviations.some(
          (d) => d.screen === scenario.screen && d.region === region.id,
        ),
      };
    });
  const referenceFrame = reference
    ? { width: reference.image.width, height: reference.image.height }
    : null;
  const geometry =
    mode === 'capture' && frame && result.status === 'captured'
      ? compareGeometry({ regions, referenceFrame, renderFrame: frame })
      : null;
  failures.push(...(geometry?.failures ?? []));

  /** @type {ScenarioResult['status']} */
  let status = result.status;
  let baseline;
  if (mode === 'regression') {
    baseline = path.join(
      taskPaths(scenario.task).baselines,
      `${scenario.id}-${scenario.browser}-${process.platform}.png`,
    );
    const error = result.regression?.error ?? null;
    if (result.status === 'captured') {
      status = error ? classifyRegression(error) : 'matched';
      if (status === 'missing') {
        failures.push(
          `no baseline at ${baseline}: create it deliberately with \`pnpm design regress ${scenario.task} --update\` on the platform that checks it, review it and commit it`,
        );
      } else if (status === 'different') {
        failures.push(
          `the render differs from the reviewed baseline ${baseline}`,
        );
      } else if (status === 'failed' && error) {
        failures.push(error.split('\n')[0] ?? error);
      }
    }
  }
  const screenshot = fs.existsSync(scenario.output.screenshot)
    ? path.relative(runDir, scenario.output.screenshot)
    : undefined;
  const comparison =
    mode === 'regression' ? comparisonImages(runDir, scenario) : null;
  return {
    ...base,
    status,
    ...(comparison ? { comparison } : {}),
    ...(result.error ? { error: result.error } : {}),
    ...(screenshot ? { screenshot } : {}),
    ...(reference
      ? {
          referenceImage: `references/${scenario.task}/${path.basename(reference.file)}`,
        }
      : {}),
    ...(frame ? { frame } : {}),
    environment: result.environment,
    regions: regions.map((r) => ({
      id: r.id,
      label: r.label,
      mapping: r.mapping,
      box: r.measured?.box ?? null,
      reference: r.reference,
    })),
    referenceFrame,
    geometry,
    a11y: result.a11y,
    unexpectedRequests: result.unexpectedRequests,
    failures,
    ...(baseline ? { baseline } : {}),
  };
};

/**
 * Runs scenarios of one or more checked plans and writes the evidence.
 * @param {{
 *   root: string, plans: Array<{ plan: Plan, source: string }>, mode: Mode,
 *   label?: string | undefined, scenarioIds?: string[], update?: boolean,
 *   spawn?: Spawn, now?: () => Date,
 * }} input
 * @returns {{ ok: boolean, runs: Array<{ task: string, dir: string, report: RunReport }>, messages: string[] }}
 */
export const runScenarios = ({
  root,
  plans,
  mode,
  label,
  scenarioIds = [],
  update = false,
  spawn = defaultSpawn,
  now = () => new Date(),
}) => {
  /** @type {string[]} */
  const messages = [];
  const selected = plans.map(({ plan, source }) => {
    const captures = plan.captures.filter(
      (capture) =>
        (!scenarioIds.length || scenarioIds.includes(capture.id)) &&
        (mode === 'capture' || capture.regression),
    );
    return { plan, source, captures };
  });
  const unknown = scenarioIds.filter(
    (id) => !plans.some(({ plan }) => plan.captures.some((c) => c.id === id)),
  );
  if (unknown.length) {
    return {
      ok: false,
      runs: [],
      messages: [`Unknown capture scenario(s): ${unknown.join(', ')}.`],
    };
  }
  const work = selected.filter((item) => item.captures.length);
  if (!work.length) {
    return {
      ok: true,
      runs: [],
      messages: [
        mode === 'regression'
          ? 'No regression scenarios ("regression": true) to check.'
          : 'No capture scenarios to run.',
      ],
    };
  }

  // One Playwright run (one build) for every selected scenario.
  const scope =
    mode === 'regression' ? '_regression' : (work[0]?.plan.task ?? '');
  if (mode === 'capture' && work.length > 1) {
    return { ok: false, runs: [], messages: ['Capture one task at a time.'] };
  }
  const run = createRunDir(root, scope, label);
  const scenarios = work.flatMap(({ plan, captures }) =>
    manifestScenarios({ plan, captures, runDir: run.dir, mode }),
  );
  for (const dir of ['captures', 'results', 'references']) {
    fs.mkdirSync(path.join(run.dir, dir), { recursive: true });
  }
  for (const { plan } of work) {
    fs.mkdirSync(path.join(run.dir, 'references', plan.task), {
      recursive: true,
    });
    for (const reference of plan.references) {
      const source = path.join(root, taskPaths(plan.task).dir, reference.file);
      if (fs.existsSync(source)) {
        fs.copyFileSync(
          source,
          path.join(
            run.dir,
            'references',
            plan.task,
            path.basename(reference.file),
          ),
        );
      }
    }
  }
  /** @type {Manifest} */
  const manifest = { mode, runDir: run.dir, scenarios };
  const manifestFile = path.join(run.dir, 'manifest.json');
  fs.writeFileSync(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`);

  const projects = [...new Set(scenarios.map((s) => s.browser))];
  const playwright = runPlaywright({
    root,
    manifestFile,
    runDir: run.dir,
    projects,
    update: mode === 'regression' && update,
    spawn,
  });
  if (playwright.startError) messages.push(playwright.startError);

  const revision = revisionOf(root, spawn);
  const createdAt = now().toISOString();
  const runs = work.map(({ plan, source }) => {
    const results = scenarios
      .filter((s) => s.task === plan.task)
      .map((scenario) =>
        scenarioResult({
          plan,
          scenario,
          result: fs.existsSync(scenario.output.result)
            ? /** @type {SpecResult} */ (readJson(scenario.output.result))
            : null,
          runDir: run.dir,
          mode,
          playwright,
        }),
      );
    /** @type {RunReport} */
    const report = {
      task: plan.task,
      title: plan.title,
      label: run.label,
      mode,
      createdAt,
      revision,
      planSha256: createHash('sha256').update(source).digest('hex'),
      ok:
        !playwright.startError &&
        results.every(
          (r) =>
            !r.failures.length && ['captured', 'matched'].includes(r.status),
        ),
      scenarios: results,
      observations: plan.review.rounds.flatMap((round) =>
        round.findings.map((f) => ({
          round: round.id,
          capture: f.capture,
          region: f.region,
          observed: f.observed,
          change: f.change,
          status: f.status,
        })),
      ),
      remaining: plan.review.remaining.map((r) => r.text),
      deviations: plan.deviations.map((d) => ({
        screen: d.screen,
        region: d.region,
        observed: d.observed,
        implemented: d.implemented,
        reason: d.reason,
      })),
      human: plan.review.human,
    };
    return { task: plan.task, dir: run.dir, report };
  });

  const write = (/** @type {string} */ name, /** @type {string} */ text) =>
    fs.writeFileSync(path.join(run.dir, name), text);
  if (runs.length === 1 && runs[0]) {
    const { report } = runs[0];
    write('report.json', `${JSON.stringify(report, null, 2)}\n`);
    write('report.html', runReportHtml(report));
    write(
      'summary.md',
      runSummaryMarkdown(report, `${run.relative}/report.html`),
    );
  } else {
    // Several tasks in one regression run: a page per task and an index.
    write(
      'report.json',
      `${JSON.stringify(
        runs.map((r) => r.report),
        null,
        2,
      )}\n`,
    );
    for (const { task, report } of runs) {
      write(`${task}.html`, runReportHtml(report));
    }
    write(
      'report.html',
      indexHtml(
        'regression',
        runs.map(({ task, report }) => ({
          label: task,
          href: `${task}.html`,
          mode: report.mode,
          createdAt: report.createdAt,
          ok: report.ok,
          commit: report.revision.commit,
        })),
      ),
    );
    write(
      'summary.md',
      runs
        .map(({ task, report }) =>
          runSummaryMarkdown(report, `${run.relative}/${task}.html`),
        )
        .join('\n'),
    );
  }
  if (mode === 'capture') writeIndex(root, scope);
  return {
    ok: runs.every((r) => r.report.ok) && !playwright.startError,
    runs,
    messages: [...messages, `Evidence: ${run.relative}/report.html`],
  };
};

/**
 * Regenerates reports/design/<task>/index.html from the runs' report.json
 * (folders that hold anything else are left out, not trusted).
 */
const writeIndex = (/** @type {string} */ root, /** @type {string} */ task) => {
  const dir = path.join(root, taskPaths(task).evidence);
  const runs = fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) => {
      const file = path.join(dir, entry.name, 'report.json');
      try {
        const report = /** @type {Partial<RunReport>} */ (readJson(file));
        if (
          typeof report.createdAt !== 'string' ||
          typeof report.mode !== 'string' ||
          !report.revision
        ) {
          return [];
        }
        return [
          {
            label: entry.name,
            href: `${entry.name}/report.html`,
            mode: report.mode,
            createdAt: report.createdAt,
            ok: report.ok === true,
            commit: report.revision.commit,
          },
        ];
      } catch {
        return [];
      }
    })
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  fs.writeFileSync(path.join(dir, 'index.html'), indexHtml(task, runs));
};
