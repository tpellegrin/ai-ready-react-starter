// @ts-check
/**
 * Runs a plan's capture scenarios in a real browser and turns the results
 * into evidence (`pnpm design capture` / `pnpm design regress`). A run
 * passes only when Playwright exits 0 and every scenario passed: its exit
 * status and per-test verdicts (read from its JSON report) override result
 * files that look successful.
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
 *   baselines in design/<task>/baselines/ with Playwright's own screenshot
 *   comparison and default thresholds, one per screenshot. The set counts
 *   too: a reviewed screenshot the render no longer produces (content at
 *   the end of the page is gone) fails, like a missing baseline for a new
 *   one. Nothing is written or removed unless `--update` (explicit) asks:
 *   then the produced screenshots are written and the scenario's reviewed
 *   ones it no longer produces are removed, for review.
 */
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import { stripAnsi } from '../diagnostics.mjs';
import { compareGeometry } from './geometry.mjs';
import {
  createRunDir,
  preflight,
  removeOwnedFile,
  writeOwnedFile,
} from './output.mjs';
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
 *   extent: Capture['extent'], scrollContainer: import('./plan.mjs').Locator | null,
 *   session: Capture['session'], api: Capture['api'],
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
      extent: capture.extent,
      scrollContainer: capture.scrollContainer ?? null,
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
 * A scenario's baseline for one screenshot, as Playwright names it for this
 * browser and platform (snapshotPathTemplate): position 0 is the first
 * screenshot, later scroll positions are <id>--scroll-<n>.
 * @param {{ task: string, id: string, browser: string }} scenario
 * @param {number} position
 */
const baselineFile = ({ task, id, browser }, position) =>
  `${taskPaths(task).baselines}/${id}${position ? `--scroll-${position}` : ''}-${browser}-${process.platform}.png`;

/**
 * The reviewed set: the baselines on disk for exactly this task, scenario,
 * browser and platform, by screenshot position. Other scenarios (ids are
 * kebab-case, so `desktop` never matches `desktop-yearly`), browsers and
 * platforms are not part of it.
 * @param {string} root
 * @param {{ task: string, id: string, browser: string }} scenario
 * @returns {Array<{ position: number, file: string }>}
 */
const reviewedBaselines = (root, scenario) => {
  const dir = taskPaths(scenario.task).baselines;
  if (!fs.existsSync(path.join(root, dir))) return [];
  const pattern = new RegExp(
    `^${scenario.id}(?:--scroll-([1-9]\\d*))?-${scenario.browser}-${process.platform}\\.png$`,
  );
  return fs
    .readdirSync(path.join(root, dir))
    .flatMap((name) => {
      const match = pattern.exec(name);
      return match
        ? [{ position: Number(match[1] ?? 0), file: `${dir}/${name}` }]
        : [];
    })
    .sort((a, b) => a.position - b.position);
};

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

/** @param {string} text */
const firstLine = (text) =>
  stripAnsi(text)
    .split('\n')
    .map((line) => line.trim())
    .find(Boolean) ?? '';

/**
 * @typedef {{ status: 'passed' | 'failed' | 'skipped', error: string | null }} TestOutcome
 * @typedef {{ tests: Map<string, TestOutcome>, errors: string[] }} Outcomes
 */

/** The key of a scenario's test in Playwright's report. */
const testKey = (
  /** @type {{ task: string, id: string, browser: string }} */ scenario,
) => `${scenario.task}/${scenario.id}|${scenario.browser}`;

/**
 * What Playwright's JSON report says about each scenario's test, and the
 * errors outside any test (web server, configuration). Null when there is
 * no readable report (Playwright did not get that far).
 * @param {string} file
 * @returns {Outcomes | null}
 */
export const readOutcomes = (file) => {
  /**
   * @typedef {{ message?: string }} JsonError
   * @typedef {{ projectName: string, status: string, results?: Array<{ error?: JsonError, errors?: JsonError[] }> }} JsonTest
   * @typedef {{ title: string, specs?: Array<{ title: string, tests: JsonTest[] }>, suites?: JsonSuite[] }} JsonSuite
   */
  /** @type {{ suites?: JsonSuite[], errors?: JsonError[] }} */
  let report;
  try {
    report = /** @type {typeof report} */ (readJson(file));
  } catch {
    return null;
  }
  /** @type {Map<string, TestOutcome>} */
  const tests = new Map();
  /** @param {JsonSuite} suite */
  const visit = (suite) => {
    for (const spec of suite.specs ?? []) {
      for (const test of spec.tests) {
        const errors = (test.results ?? []).flatMap((r) => [
          ...(r.errors ?? []),
          ...(r.error ? [r.error] : []),
        ]);
        tests.set(`${suite.title}|${test.projectName}`, {
          status:
            test.status === 'skipped'
              ? 'skipped'
              : test.status === 'expected'
                ? 'passed'
                : 'failed',
          error: errors.find((e) => e.message)?.message ?? null,
        });
      }
    }
    for (const child of suite.suites ?? []) visit(child);
  };
  for (const suite of report.suites ?? []) visit(suite);
  return {
    tests,
    errors: (report.errors ?? []).map((e) => e.message ?? 'unknown error'),
  };
};

/**
 * @typedef {{
 *   status: 'captured' | 'failed', phase?: string, error?: string,
 *   frame?: { width: number, height: number },
 *   environment?: Record<string, unknown>,
 *   regions?: Array<{ id: string, found: boolean, visible: boolean, count: number, box: { x: number, y: number, width: number, height: number } | null }>,
 *   a11y?: Array<{ id: string, impact: string, help: string, targets: string[] }>,
 *   unexpectedRequests?: string[],
 *   regression?: { error: string | null, errors?: string[] },
 *   screenshots?: Array<{ file: string, scrollTop: number }>,
 *   extent?: { kind: 'viewport' } | { kind: 'scroll', container: string, clientHeight: number, scrollHeight: number, positions: number[], complete: boolean, missing: number },
 *   content?: { width: number, height: number },
 * }} SpecResult  written by e2e/design/capture.spec.ts
 */

/**
 * Playwright's expected/actual/diff images of failed baseline comparisons
 * (relative to the run folder), per screenshot, if it wrote any.
 * @param {string} runDir
 * @param {ManifestScenario} scenario
 * @returns {Array<{ shot: string, expected?: string, actual?: string, diff?: string }> | null}
 */
const comparisonImages = (runDir, scenario) => {
  const output = path.join(runDir, 'playwright');
  if (!fs.existsSync(output)) return null;
  const pattern = new RegExp(
    `${scenario.task}[\\\\/]baselines[\\\\/](${scenario.id}(?:--scroll-\\d+)?)-(expected|actual|diff)\\.png$`,
  );
  /** @type {Map<string, Record<string, string>>} */
  const shots = new Map();
  /** @param {string} dir */
  const visit = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        visit(full);
        continue;
      }
      const match = pattern.exec(full);
      if (match?.[1] && match[2]) {
        const images = shots.get(match[1]) ?? {};
        images[match[2]] = path.relative(runDir, full);
        shots.set(match[1], images);
      }
    }
  };
  visit(output);
  return shots.size
    ? [...shots.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([shot, images]) => ({ shot, ...images }))
    : null;
};

/**
 * Turns what the spec wrote (or did not write) into a scenario result.
 * A scenario passes only when the spec's result and Playwright agree: a test
 * that failed after saving a successful result (a console error found at
 * teardown, a late assertion) fails the scenario.
 * @param {{ root: string, plan: Plan, scenario: ManifestScenario, result: SpecResult | null, outcome: TestOutcome | null, runDir: string, mode: Mode, update: boolean, reviewed: Array<{ position: number, file: string }>, playwright: { output: string, startError: string | null } }} input
 * @returns {ScenarioResult}
 */
const scenarioResult = ({
  root,
  plan,
  scenario,
  result,
  outcome,
  runDir,
  mode,
  update,
  reviewed,
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
  const testError =
    outcome?.status === 'failed' ? firstLine(outcome.error ?? 'failed') : null;
  if (!result) {
    const said = stripAnsi(playwright.output)
      .split('\n')
      .find((line) => /error/i.test(line))
      ?.trim();
    const screenshot = fs.existsSync(scenario.output.screenshot)
      ? path.relative(runDir, scenario.output.screenshot)
      : undefined;
    return {
      ...base,
      status: 'failed',
      error:
        playwright.startError ??
        `No result was written for this scenario. Playwright said:\n${tail(playwright.output)}`,
      ...(screenshot ? { screenshot } : {}),
      failures: [
        playwright.startError ??
          (testError
            ? `Playwright reported the test failed: ${testError}`
            : `the scenario did not run to completion${said ? `: ${said}` : ''}`),
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
      ? compareGeometry({
          regions,
          referenceFrame,
          // The scrolled content's frame: boxes below the fold count too.
          renderFrame: result.content ?? frame,
        })
      : null;
  failures.push(...(geometry?.failures ?? []));
  const extent = result.extent;
  if (extent?.kind === 'scroll' && !extent.complete) {
    failures.push(
      `incomplete capture: the last ${extent.missing} px of ${extent.container} were never in view after ${extent.positions.length} screenshot(s)`,
    );
  }

  /** @type {ScenarioResult['status']} */
  let status = result.status;
  /** @type {string[] | undefined} */
  let baselines;
  /** @type {ScenarioResult['screenshotSet']} */
  let screenshotSet;
  if (mode === 'regression') {
    // One baseline per screenshot (scroll positions after the first are
    // named <id>--scroll-<n>).
    baselines = (result.screenshots ?? [{ scrollTop: 0 }]).map((_, index) =>
      baselineFile(scenario, index),
    );
    // The set, once the screenshots were taken: reviewed positions past the
    // last one produced have disappeared.
    const produced = result.screenshots?.length ?? 0;
    if (result.status === 'captured' && produced) {
      const disappeared = reviewed.filter((r) => r.position >= produced);
      screenshotSet = {
        reviewed: reviewed.map((r) => r.file),
        produced: baselines,
        disappeared: disappeared.map((r) => r.file),
        // The reviewed images, kept with the run's evidence.
        images: disappeared.flatMap((r) => {
          const source = path.join(root, r.file);
          if (!fs.lstatSync(source, { throwIfNoEntry: false })?.isFile()) {
            return [];
          }
          const copy = path.join(
            'reviewed',
            scenario.task,
            path.basename(r.file),
          );
          fs.mkdirSync(path.dirname(path.join(runDir, copy)), {
            recursive: true,
          });
          fs.copyFileSync(source, path.join(runDir, copy));
          return [copy];
        }),
      };
      if (disappeared.length && !update) {
        failures.push(
          `screenshot set changed: ${disappeared.length} reviewed screenshot(s) no longer produced (${screenshotSet.disappeared.join(', ')}); this render has ${produced} of the ${reviewed.length} reviewed. Content at the end of the page is gone or shorter: if that is intended, review the render and run \`pnpm design regress ${scenario.task} --update\``,
        );
      }
    }
    const error = result.regression?.error ?? null;
    const errors = result.regression?.errors ?? (error ? [error] : []);
    if (result.status === 'captured') {
      status = error ? classifyRegression(error) : 'matched';
      const missing = errors
        .filter((e) => classifyRegression(e) === 'missing')
        .map((e) => {
          const at =
            /A snapshot doesn't exist at (\S+?\.png)/.exec(e)?.[1] ?? '';
          return at.includes('design/')
            ? at.slice(at.lastIndexOf('design/'))
            : at;
        });
      const different = errors.filter(
        (e) => classifyRegression(e) === 'different',
      ).length;
      if (missing.length) {
        failures.push(
          `no baseline at ${missing.join(', ')}: create it deliberately with \`pnpm design regress ${scenario.task} --update\` on the platform that checks it, review it and commit it`,
        );
      }
      if (different) {
        failures.push(
          `${different} screenshot(s) differ from the reviewed baselines (${baselines.join(', ')})`,
        );
      }
      if (status === 'failed' && error) {
        failures.push(error.split('\n')[0] ?? error);
      }
      if (
        status === 'matched' &&
        screenshotSet?.disappeared.length &&
        !update
      ) {
        status = 'different';
      }
    }
  }
  // Playwright's verdict, unless it only repeats what the result says.
  if (testError) {
    const known = [
      result.error,
      result.regression?.error,
      ...(result.unexpectedRequests?.length ? ['undeclared API requests'] : []),
    ].some((message) => !!message && testError.includes(firstLine(message)));
    if (!known) {
      failures.push(
        `Playwright reported the test failed after the scenario was recorded: ${testError}`,
      );
    }
    if (status === 'captured' || status === 'matched') status = 'failed';
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
    ...(result.content ? { contentFrame: result.content } : {}),
    ...(extent ? { extent } : {}),
    screenshots: (result.screenshots ?? []).map((shot) => ({
      file: `captures/${shot.file}`,
      scrollTop: shot.scrollTop,
    })),
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
    ...(baselines ? { baselines } : {}),
    ...(screenshotSet ? { screenshotSet } : {}),
  };
};

/**
 * `--update`: removes the reviewed baselines a scenario no longer produces,
 * only that scenario's on this browser and platform, and only when it
 * passed (a failed render proves nothing about the set). Each path is
 * checked again (inside design/<task>/baselines/, no link) before removal.
 * @param {string} root
 * @param {string} task
 * @param {ScenarioResult} result
 * @returns {string[]} the removed baselines
 */
const reconcileBaselines = (root, task, result) => {
  const set = result.screenshotSet;
  if (!set?.disappeared.length) return [];
  if (result.failures.length || result.status !== 'matched') {
    result.failures.push(
      `the ${set.disappeared.length} reviewed baseline(s) this render no longer produces were kept (${set.disappeared.join(', ')}): the scenario failed, so its set was not updated`,
    );
    return [];
  }
  const base = taskPaths(task).baselines;
  const blocked = preflight(root, base, set.disappeared, { replace: true });
  if (blocked.length) {
    result.failures.push(...blocked);
    result.status = 'failed';
    return [];
  }
  for (const file of set.disappeared) removeOwnedFile(root, base, file);
  set.removed = set.disappeared;
  return set.removed;
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
  // Baselines Playwright would write or this run would remove (--update),
  // checked before it starts: inside design/<task>/baselines/, through no
  // link.
  if (mode === 'regression' && update) {
    const blocked = preflight(
      root,
      'design',
      work.flatMap(({ plan, captures }) =>
        captures.map(
          (capture) =>
            `${taskPaths(plan.task).baselines}/${capture.id}-${capture.browser}-${process.platform}.png`,
        ),
      ),
      { replace: true },
    );
    // Files already there (later scroll positions are only known after the
    // run, and any of them may be removed as no longer produced): none may
    // be a link either.
    const existing = work.flatMap(({ plan }) => {
      const dir = path.join(root, taskPaths(plan.task).baselines);
      return fs.existsSync(dir)
        ? fs
            .readdirSync(dir)
            .map((name) => `${taskPaths(plan.task).baselines}/${name}`)
        : [];
    });
    blocked.push(...preflight(root, 'design', existing, { replace: true }));
    if (blocked.length) throw new Error(blocked.join('\n'));
  }
  const run = createRunDir(root, scope, label);
  const scenarios = work.flatMap(({ plan, captures }) =>
    manifestScenarios({ plan, captures, runDir: run.dir, mode }),
  );
  // The reviewed sets, as they are before Playwright runs (--update
  // rewrites them).
  const reviewed = new Map(
    mode === 'regression'
      ? scenarios.map((s) => [testKey(s), reviewedBaselines(root, s)])
      : [],
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
  const outcomes = readOutcomes(path.join(run.dir, 'playwright.json'));
  /** @type {string[]} */
  const runFailures = [];
  if (playwright.startError) {
    runFailures.push(playwright.startError);
  } else if (playwright.status !== 0) {
    // A failed scenario test explains the exit (its own result says so, and
    // the other tasks of a regression run keep theirs); anything else fails
    // every task of the run.
    const outside = outcomes?.errors ?? [];
    const attributed = scenarios.some(
      (s) => outcomes?.tests.get(testKey(s))?.status === 'failed',
    );
    if (outside.length || !attributed) {
      runFailures.push(`Playwright exited with status ${playwright.status}.`);
    }
    for (const error of outside) {
      runFailures.push(`Error outside any scenario: ${firstLine(error)}`);
    }
    if (!attributed && !outside.length) {
      runFailures.push(
        `No scenario's test failed in Playwright's report${outcomes ? '' : ' (there is none)'}, so the failure is not attributed to one. Playwright said:\n${tail(playwright.output)}`,
      );
    }
  }

  const revision = revisionOf(root, spawn);
  const createdAt = now().toISOString();
  const runs = work.map(({ plan, source }) => {
    const results = scenarios
      .filter((s) => s.task === plan.task)
      .map((scenario) =>
        scenarioResult({
          root,
          plan,
          scenario,
          result: fs.existsSync(scenario.output.result)
            ? /** @type {SpecResult} */ (readJson(scenario.output.result))
            : null,
          outcome: outcomes?.tests.get(testKey(scenario)) ?? null,
          runDir: run.dir,
          mode,
          update,
          reviewed: reviewed.get(testKey(scenario)) ?? [],
          playwright,
        }),
      );
    if (mode === 'regression' && update) {
      for (const result of results) {
        const removed = reconcileBaselines(root, plan.task, result);
        if (removed.length) {
          messages.push(
            `Removed ${removed.length} baseline(s) ${plan.task}/${result.id} no longer produces: ${removed.join(', ')} (copies in the run's reviewed/ folder).`,
          );
        }
      }
    }
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
        !runFailures.length &&
        results.every(
          (r) =>
            !r.failures.length && ['captured', 'matched'].includes(r.status),
        ),
      runFailures,
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
    ok: runs.every((r) => r.report.ok) && !runFailures.length,
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
  writeOwnedFile(
    root,
    'reports/design',
    `${taskPaths(task).evidence}/index.html`,
    indexHtml(task, runs),
  );
};
