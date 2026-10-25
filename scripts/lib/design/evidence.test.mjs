import fs from 'node:fs';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { classifyRegression, runScenarios } from './capture.mjs';
import { compareGeometry, sides } from './geometry.mjs';
import { parsePlan } from './plan.mjs';
import {
  escapeHtml,
  planSummary,
  runReportHtml,
  runSummaryMarkdown,
} from './report.mjs';
import {
  completePlan,
  makePng,
  projectWithPlan,
  withChanges,
} from './testing.mjs';

/** @typedef {import('./capture.mjs').Spawn} Spawn */
/** @typedef {import('./capture.mjs').Manifest} Manifest */

/** @type {Array<() => void>} */
const cleanups = [];
/** @param {string} text @returns {unknown} */
const parseJson = (text) => JSON.parse(text);
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
});

/** @param {unknown} raw */
const parse = (raw) => {
  const parsed = parsePlan(JSON.stringify(raw));
  if (!parsed.ok) throw new Error(JSON.stringify(parsed.issues));
  return parsed.plan;
};

describe('region geometry', () => {
  const box = (
    /** @type {number[]} */ [x = 0, y = 0, width = 0, height = 0],
  ) => ({
    x,
    y,
    width,
    height,
  });
  /** @param {Array<[string, number[], number[] | null, string?]>} items */
  const regions = (items, deviation = '') =>
    items.map(([id, reference, render, parent]) => ({
      id,
      label: id,
      parent,
      reference: box(reference),
      measured: render
        ? { found: true, visible: true, count: 1, box: box(render) }
        : { found: false, visible: false, count: 0, box: null },
      deviation: id === deviation,
    }));

  it('tells sides apart with a tolerance', () => {
    expect(sides(box([0, 0, 10, 10]), box([0, 20, 10, 10]), 1)).toEqual([
      'above',
    ]);
    expect(sides(box([20, 0, 10, 10]), box([0, 0, 10, 10]), 1)).toEqual([
      'right',
    ]);
    expect(sides(box([0, 0, 10, 10]), box([10.5, 0, 10, 10]), 1)).toEqual([
      'left',
    ]);
    expect(sides(box([0, 0, 10, 10]), box([5, 5, 10, 10]), 1)).toEqual([]);
    // Different rows: only the vertical order counts.
    expect(sides(box([0, 0, 10, 10]), box([40, 30, 10, 10]), 1)).toEqual([
      'above',
    ]);
  });

  it('passes a render that keeps the arrangement at another scale', () => {
    const geometry = compareGeometry({
      // A 400 px sketch and a 1200 px render of the same layout.
      regions: regions([
        ['title', [20, 20, 200, 30], [60, 60, 600, 90]],
        ['action', [300, 20, 80, 30], [900, 60, 240, 90]],
        ['list', [20, 70, 360, 200], [60, 210, 1080, 600]],
      ]),
      referenceFrame: { width: 400, height: 300 },
      renderFrame: { width: 1200, height: 900 },
    });
    expect(geometry.failures).toEqual([]);
    expect(geometry.relations.map((r) => r.status)).toEqual([
      'match',
      'match',
      'match',
    ]);
    expect(geometry.regions.every((r) => !r.sizeDiffers)).toBe(true);
  });

  it('fails a changed arrangement unless a deviation documents it', () => {
    const input = (/** @type {string} */ deviation) => ({
      regions: regions(
        [
          ['title', [20, 20, 200, 30], [60, 60, 600, 90]],
          // Beside the title in the sketch, below it in the render.
          ['action', [300, 20, 80, 30], [60, 160, 240, 90]],
        ],
        deviation,
      ),
      referenceFrame: { width: 400, height: 300 },
      renderFrame: { width: 1200, height: 900 },
    });
    expect(compareGeometry(input('')).failures).toEqual([
      '"title" is left of "action" in the reference but above it in the render',
    ]);
    const documented = compareGeometry(input('action'));
    expect(documented.failures).toEqual([]);
    expect(documented.relations[0]?.status).toBe('deviation');
  });

  it('accepts a child half over its parent, and one outside it as in the reference', () => {
    const geometry = compareGeometry({
      regions: regions([
        ['card', [100, 100, 200, 200], [100, 100, 200, 200]],
        // A badge centered on the top border: half inside.
        ['badge', [120, 90, 60, 20], [120, 90, 60, 20], 'card'],
        // A tooltip drawn above the card in the reference, and rendered so.
        ['tip', [100, 40, 80, 30], [100, 40, 80, 30], 'card'],
      ]),
      referenceFrame: { width: 400, height: 400 },
      renderFrame: { width: 400, height: 400 },
    });
    expect(geometry.failures).toEqual([]);
    expect(geometry.containment.map((c) => c.status)).toEqual([
      'inside',
      'outside',
    ]);
  });

  it('fails missing regions and children outside their parent; notes size differences', () => {
    const geometry = compareGeometry({
      regions: regions([
        ['page', [0, 0, 400, 300], [0, 0, 1200, 900]],
        ['summary', [20, 20, 360, 60], [60, 60, 300, 90], 'page'],
        ['list', [20, 100, 360, 180], null, 'page'],
        ['footer', [0, 280, 400, 20], [0, 950, 1200, 40], 'page'],
      ]),
      referenceFrame: { width: 400, height: 300 },
      renderFrame: { width: 1200, height: 900 },
    });
    expect(geometry.failures).toEqual([
      'region "list" (list) is missing in the render',
      'region "footer" is not inside its parent "page" in the render',
    ]);
    expect(
      geometry.containment.find((c) => c.child === 'summary')?.status,
    ).toBe('inside');
    // 90% of the width in the sketch, 25% in the render.
    expect(geometry.regions.find((r) => r.id === 'summary')?.sizeDiffers).toBe(
      true,
    );
  });
});

describe('reports', () => {
  it('escapes untrusted text', () => {
    expect(escapeHtml('<img src=x onerror="alert(1)">&\'')).toBe(
      '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;&amp;&#39;',
    );
    const raw = withChanges(completePlan(), {
      title: '<script>alert("title")</script>',
      'screens.0.regions.1.label': 'Add | <b>note</b>',
    });
    const summary = planSummary(parse(raw));
    expect(summary).not.toMatch(/<script>|<b>/);
    expect(summary).toContain('Add \\| &lt;b&gt;note&lt;/b&gt;');
    expect(summary).toContain('Human review: **not-reviewed**');
  });

  it('lists remaining differences one per line in the pull-request summary', () => {
    const summary = runSummaryMarkdown(
      {
        task: 'notes-page',
        title: 'Notes',
        label: 'run-1',
        mode: 'capture',
        createdAt: '2026-10-22T10:00:00.000Z',
        revision: { commit: 'abc', uncommittedChanges: false },
        planSha256: 'f'.repeat(64),
        ok: true,
        runFailures: [],
        scenarios: [],
        observations: [],
        remaining: ['Rows are taller.', 'Type | size <differs>.'],
        deviations: [],
        human: { status: 'not-reviewed' },
      },
      'reports/design/notes-page/run-1/report.html',
    );
    expect(summary).toContain(
      '- Agent observations: 0 (plan review); remaining differences: 2\n  - Rows are taller.\n  - Type \\| size &lt;differs&gt;.\n',
    );
  });

  it('keeps mechanical results, agent observations and human review apart', () => {
    const html = runReportHtml({
      task: 'notes-page',
      title: '</title><script>x()</script>',
      label: 'run-1',
      mode: 'capture',
      createdAt: '2026-10-22T10:00:00.000Z',
      revision: { commit: 'abc', uncommittedChanges: true },
      planSha256: 'f'.repeat(64),
      ok: true,
      runFailures: [],
      scenarios: [
        {
          id: 'desktop',
          screen: 'notes',
          state: 'content',
          compare: null,
          status: 'captured',
          failures: [],
          environment: { browser: '<chromium>' },
        },
      ],
      observations: [
        {
          round: 'round-1',
          capture: 'desktop',
          observed: 'spacing <tight>',
          status: 'fixed',
        },
      ],
      remaining: ['icon <missing>'],
      deviations: [],
      human: { status: 'not-reviewed' },
    });
    expect(html).not.toMatch(/<script>|<chromium>|<tight>|<missing>/);
    expect(html).toContain('<th>Mechanical checks</th>');
    expect(html).toContain('<th>Agent observations</th>');
    expect(html).toMatch(/<th>Human review<\/th>\s*<td>\s*not-reviewed/);
    expect(html.replace(/\s+/g, ' ')).toContain(
      'nothing here means a person approved the design',
    );
    expect(html).not.toMatch(/https?:\/\//);
  });
});

describe('capture runs', () => {
  /**
   * A project with the complete plan, a sentinel in reports/verify and a
   * fake Playwright that writes what `write` returns for each scenario.
   * @param {(scenario: Manifest['scenarios'][number]) => Record<string, unknown> | null} write
   * @param {{ start?: 'fail' | 'ok', output?: string, raw?: unknown, exit?: number, report?: unknown }} [options]
   *   exit: Playwright's exit status; report: its JSON report
   */
  const setup = (
    write,
    {
      start = 'ok',
      output = '',
      raw = completePlan(),
      exit = 0,
      report = undefined,
    } = {},
  ) => {
    const project = projectWithPlan(raw);
    cleanups.push(project.cleanup);
    project.write('reports/verify/report.json', '{"caller":"kept"}');
    project.write(
      'reports/design/notes-page/initial/report.json',
      '{"previous":"kept"}',
    );
    /** @type {string[][]} */
    const calls = [];
    /** @type {Spawn} */
    const spawn = (command, args, options) => {
      calls.push([command, ...args]);
      if (command === 'git') {
        return { status: 0, stdout: args[0] === 'rev-parse' ? 'abc123\n' : '' };
      }
      if (start === 'fail') {
        return { status: null, error: new Error(`spawn ${command} ENOENT`) };
      }
      const manifest = /** @type {Manifest} */ (
        parseJson(fs.readFileSync(options.env.DESIGN_MANIFEST ?? '', 'utf8'))
      );
      for (const scenario of manifest.scenarios) {
        const result = write(scenario);
        if (!result) continue;
        fs.mkdirSync(path.dirname(scenario.output.result), { recursive: true });
        fs.writeFileSync(scenario.output.result, JSON.stringify(result));
        fs.writeFileSync(scenario.output.screenshot, makePng(12, 9));
      }
      if (report !== undefined) {
        fs.writeFileSync(
          options.env.PLAYWRIGHT_JSON_OUTPUT_FILE ?? '',
          JSON.stringify(report),
        );
      }
      return { status: exit, stdout: output };
    };
    const run = (
      /** @type {Partial<Parameters<typeof runScenarios>[0]>} */ input = {},
    ) =>
      runScenarios({
        root: project.root,
        plans: [{ plan: parse(raw), source: JSON.stringify(raw) }],
        mode: 'capture',
        spawn,
        now: () => new Date('2026-10-22T10:00:00Z'),
        ...input,
      });
    return { project, calls, run };
  };
  const captured = {
    status: 'captured',
    frame: { width: 1200, height: 900 },
    environment: { browser: 'chromium 140' },
    regions: [
      {
        id: 'page',
        found: true,
        visible: true,
        count: 1,
        box: { x: 0, y: 0, width: 1200, height: 900 },
      },
      {
        id: 'actions',
        found: true,
        visible: true,
        count: 1,
        box: { x: 900, y: 60, width: 240, height: 90 },
      },
      {
        id: 'list',
        found: true,
        visible: true,
        count: 1,
        box: { x: 60, y: 210, width: 1080, height: 600 },
      },
    ],
    a11y: [],
    unexpectedRequests: [],
  };

  it('writes evidence to a new run folder and leaves other reports alone', () => {
    const { run, project, calls } = setup(() => captured);
    const outcome = run();
    expect(outcome.ok).toBe(true);
    const dir = 'reports/design/notes-page/run-1';
    for (const file of [
      'report.html',
      'report.json',
      'summary.md',
      'manifest.json',
      'index.html',
    ]) {
      const at =
        file === 'index.html'
          ? `reports/design/notes-page/${file}`
          : `${dir}/${file}`;
      expect(project.exists(at), at).toBe(true);
    }
    expect(project.exists(`${dir}/references/notes-page/desktop.png`)).toBe(
      true,
    );
    expect(project.read('reports/verify/report.json')).toBe(
      '{"caller":"kept"}',
    );
    expect(project.read('reports/design/notes-page/initial/report.json')).toBe(
      '{"previous":"kept"}',
    );
    const report = /** @type {import('./report.mjs').RunReport} */ (
      parseJson(project.read(`${dir}/report.json`))
    );
    expect(report).toMatchObject({
      ok: true,
      revision: { commit: 'abc123', uncommittedChanges: false },
      human: { status: 'not-reviewed' },
    });
    expect(report.scenarios[0]?.geometry?.failures).toEqual([]);
    const playwright = calls.find((call) => call[0]?.endsWith('playwright'));
    expect(playwright).toEqual(
      expect.arrayContaining([
        'test',
        '--config',
        'playwright.design.config.ts',
        '--project=chromium',
      ]),
    );
    expect(playwright).not.toContain('--update-snapshots=all');
  });

  /**
   * Playwright's JSON report for the complete plan's one scenario.
   * @param {string} status  'expected' or 'unexpected'
   * @param {string[]} errors  the test's error messages
   * @param {string[]} [global]  errors outside any test
   * @param {string} [task]
   */
  const playwrightReport = (
    status,
    errors,
    global = [],
    task = 'notes-page',
  ) => ({
    suites: [
      {
        title: 'capture.spec.ts',
        suites: [
          {
            title: `${task}/desktop-content`,
            specs: [
              {
                title: 'desktop-content',
                tests: [
                  {
                    projectName: 'chromium',
                    status,
                    results: [
                      { errors: errors.map((message) => ({ message })) },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
    errors: global.map((message) => ({ message })),
  });

  it('fails the run when Playwright exits non-zero after successful results, without inventing a culprit', () => {
    const { run, project } = setup(() => captured, {
      exit: 1,
      output: '1 error was not a part of any test',
    });
    const outcome = run();
    expect(outcome.ok).toBe(false);
    const report = outcome.runs[0]?.report;
    expect(report?.ok).toBe(false);
    expect(report?.runFailures).toEqual([
      'Playwright exited with status 1.',
      expect.stringMatching(
        /^No scenario's test failed in Playwright's report \(there is none\), so the failure is not attributed to one\. Playwright said:\n1 error was not a part of any test$/,
      ),
    ]);
    // Not attributed: the scenario keeps its own result, the run fails.
    expect(report?.scenarios[0]).toMatchObject({
      status: 'captured',
      failures: [],
    });
    expect(
      project.read('reports/design/notes-page/run-1/summary.md'),
    ).toContain(
      '- Mechanical checks: failed.\n  - run: Playwright exited with status 1.',
    );
  });

  it('fails a scenario whose test failed at teardown (a console error) after its result was saved', () => {
    const { run, project } = setup(() => captured, {
      exit: 1,
      report: playwrightReport('unexpected', [
        'Error: console errors: console: Uncaught TypeError: boom\n\nexpect(received).toEqual(expected)',
      ]),
    });
    const outcome = run();
    const scenario = outcome.runs[0]?.report.scenarios[0];
    expect(outcome.ok).toBe(false);
    expect(scenario).toMatchObject({
      status: 'failed',
      screenshot: 'captures/notes-page--desktop-content.png',
      failures: [
        'Playwright reported the test failed after the scenario was recorded: Error: console errors: console: Uncaught TypeError: boom',
      ],
    });
    // The scenario explains the exit status: no run-level failure.
    expect(outcome.runs[0]?.report.runFailures).toEqual([]);
    expect(
      project.exists(
        'reports/design/notes-page/run-1/captures/notes-page--desktop-content.png',
      ),
    ).toBe(true);
  });

  it("does not fail another task's report for a scenario failure in one regression run", () => {
    const raw = withChanges(completePlan(), {
      'captures.0.regression': true,
    });
    const other = withChanges(raw, { task: 'notes-two' });
    const { run, project } = setup(
      (scenario) => ({
        ...captured,
        regression: {
          error:
            scenario.task === 'notes-page'
              ? 'Screenshot comparison failed:\n\n  1000 pixels (ratio 0.01 of all image pixels) are different.'
              : null,
        },
      }),
      {
        raw,
        exit: 1,
        report: {
          suites: [
            ...playwrightReport('unexpected', [
              'Error: Screenshot comparison failed:\n\n  1000 pixels (ratio 0.01 of all image pixels) are different.',
            ]).suites,
            ...playwrightReport('expected', [], [], 'notes-two').suites,
          ],
          errors: [],
        },
      },
    );
    project.write('design/notes-two/references/desktop.png', makePng(400, 300));
    const outcome = run({
      mode: 'regression',
      plans: [
        { plan: parse(raw), source: JSON.stringify(raw) },
        { plan: parse(other), source: JSON.stringify(other) },
      ],
    });
    expect(outcome.ok).toBe(false);
    expect(
      outcome.runs.map(({ task, report }) => ({
        task,
        ok: report.ok,
        runFailures: report.runFailures,
        status: report.scenarios[0]?.status,
      })),
    ).toEqual([
      { task: 'notes-page', ok: false, runFailures: [], status: 'different' },
      { task: 'notes-two', ok: true, runFailures: [], status: 'matched' },
    ]);
  });

  it('reports a failure outside any scenario at run level', () => {
    const { run } = setup(() => captured, {
      exit: 1,
      report: playwrightReport(
        'expected',
        [],
        ['Error: Timed out waiting 180000ms from config.webServer.\n    at …'],
      ),
    });
    const outcome = run();
    expect(outcome.ok).toBe(false);
    expect(outcome.runs[0]?.report.runFailures).toEqual([
      'Playwright exited with status 1.',
      'Error outside any scenario: Error: Timed out waiting 180000ms from config.webServer.',
    ]);
    expect(outcome.runs[0]?.report.scenarios[0]?.status).toBe('captured');
  });

  it('does not repeat a failure the result already reports', () => {
    const { run } = setup(
      () => ({
        status: 'failed',
        phase: 'ready',
        error:
          'readiness condition not met: role=heading was not visible within 10000 ms',
      }),
      {
        exit: 1,
        report: playwrightReport('unexpected', [
          'Error: readiness condition not met: role=heading was not visible within 10000 ms',
        ]),
      },
    );
    expect(run().runs[0]?.report.scenarios[0]?.failures).toEqual([
      'ready failed: readiness condition not met: role=heading was not visible within 10000 ms',
    ]);
  });

  it('keeps the viewport and measures below the fold in the scrolled content', () => {
    const raw = withChanges(completePlan(), { 'captures.0.extent': 'scroll' });
    const { run, project } = setup(
      () => ({
        ...captured,
        frame: { width: 1200, height: 900 },
        content: { width: 1200, height: 2100 },
        screenshots: [
          { file: 'notes-page--desktop-content.png', scrollTop: 0 },
          { file: 'notes-page--desktop-content--scroll-1.png', scrollTop: 900 },
          {
            file: 'notes-page--desktop-content--scroll-2.png',
            scrollTop: 1200,
          },
        ],
        extent: {
          kind: 'scroll',
          container: 'main[aria-label="Content"]',
          clientHeight: 900,
          scrollHeight: 2100,
          positions: [0, 900, 1200],
          complete: true,
          missing: 0,
        },
        regions: [
          // The page contains the scroller: it extends with the content.
          {
            id: 'page',
            found: true,
            visible: true,
            count: 1,
            box: { x: 0, y: 0, width: 1200, height: 2100 },
          },
          captured.regions[1],
          // Below the fold of the 900 px viewport, inside the content.
          {
            id: 'list',
            found: true,
            visible: true,
            count: 1,
            box: { x: 60, y: 1200, width: 1080, height: 600 },
          },
        ],
      }),
      { raw },
    );
    const outcome = run();
    const scenario = outcome.runs[0]?.report.scenarios[0];
    expect(scenario?.failures).toEqual([]);
    expect(outcome.ok).toBe(true);
    expect(scenario?.contentFrame).toEqual({ width: 1200, height: 2100 });
    expect(scenario?.screenshots?.map((shot) => shot.scrollTop)).toEqual([
      0, 900, 1200,
    ]);
    expect(scenario?.geometry?.failures).toEqual([]);
    const html = project
      .read('reports/design/notes-page/run-1/report.html')
      .replace(/\s+/g, ' ');
    expect(html).toContain('viewport 1200×900, never resized');
    expect(html).toContain(
      'scroll: 3 screenshot(s) of main[aria-label=&quot;Content&quot;], end reached',
    );
    expect(html).toContain(
      'src="captures/notes-page--desktop-content--scroll-2.png"',
    );
    expect(html).toContain('scrolled 1200 px of 2100 px');
  });

  it('fails an incomplete scroll capture instead of accepting it', () => {
    const raw = withChanges(completePlan(), { 'captures.0.extent': 'scroll' });
    const { run } = setup(
      () => ({
        ...captured,
        extent: {
          kind: 'scroll',
          container: 'document',
          clientHeight: 900,
          scrollHeight: 20000,
          positions: [0, 900, 1800],
          complete: false,
          missing: 17300,
        },
      }),
      { raw },
    );
    const outcome = run();
    expect(outcome.ok).toBe(false);
    expect(outcome.runs[0]?.report.scenarios[0]?.failures).toEqual([
      'incomplete capture: the last 17300 px of document were never in view after 3 screenshot(s)',
    ]);
  });

  it('reports a failure to start Playwright for every scenario', () => {
    const { run, project } = setup(() => captured, { start: 'fail' });
    const outcome = run();
    expect(outcome.ok).toBe(false);
    expect(outcome.messages[0]).toMatch(
      /^could not start Playwright \(.*playwright\): spawn .* ENOENT$/,
    );
    const report = /** @type {import('./report.mjs').RunReport} */ (
      parseJson(project.read('reports/design/notes-page/run-1/report.json'))
    );
    expect(report.scenarios[0]).toMatchObject({
      status: 'failed',
      failures: [expect.stringMatching(/could not start Playwright/)],
    });
  });

  it('reports a scenario that never got ready, and one that wrote nothing', () => {
    const raw = withChanges(completePlan(), {
      'captures.1': { ...completePlan().captures[0], id: 'crashed' },
    });
    const { run } = setup(
      (scenario) =>
        scenario.id === 'crashed'
          ? null
          : {
              status: 'failed',
              phase: 'ready',
              error:
                'readiness condition not met: role=heading name="Notes" level=1 was not visible within 10000 ms',
              unexpectedRequests: ['GET /tags'],
            },
      {
        raw,
        output:
          'Error: Process from config.webServer was not able to start. Exit code: 1',
      },
    );
    const outcome = run();
    expect(outcome.ok).toBe(false);
    const [notReady, crashed] = outcome.runs[0]?.report.scenarios ?? [];
    expect(notReady?.failures).toEqual([
      'ready failed: readiness condition not met: role=heading name="Notes" level=1 was not visible within 10000 ms',
      'undeclared request GET /tags: declare it in the capture\'s "api"',
    ]);
    expect(crashed?.error).toMatch(/config\.webServer was not able to start/);
  });

  it('fails missing regions, changed arrangements and accessibility violations', () => {
    const { run } = setup(() => ({
      ...captured,
      regions: [
        captured.regions[0],
        {
          id: 'actions',
          found: true,
          visible: true,
          count: 1,
          box: { x: 60, y: 820, width: 240, height: 60 },
        },
        { id: 'list', found: false, visible: false, count: 0, box: null },
      ],
      a11y: [
        {
          id: 'color-contrast',
          impact: 'serious',
          help: 'contrast',
          targets: ['p'],
        },
      ],
    }));
    const failures = run().runs[0]?.report.scenarios[0]?.failures ?? [];
    expect(failures).toEqual([
      '1 accessibility violation(s): color-contrast',
      'region "list" (Notes list) is missing in the render',
    ]);
  });

  it('refuses to reuse a run label', () => {
    const { run } = setup(() => captured);
    expect(() => run({ label: 'initial' })).toThrow(
      /already exists: evidence runs are never overwritten/,
    );
  });

  it('runs only regression scenarios in regression mode, and writes baselines only on request', () => {
    const raw = withChanges(completePlan(), {
      'captures.1': {
        ...completePlan().captures[0],
        id: 'baseline-me',
        regression: true,
      },
    });
    const { run, calls } = setup(
      () => ({
        ...captured,
        regression: {
          error:
            "A snapshot doesn't exist at /x/design/notes-page/baselines/baseline-me-chromium-linux.png.",
        },
      }),
      { raw },
    );
    const outcome = run({ mode: 'regression' });
    const scenarios = outcome.runs[0]?.report.scenarios ?? [];
    expect(scenarios.map((s) => s.id)).toEqual(['baseline-me']);
    expect(scenarios[0]).toMatchObject({ status: 'missing' });
    expect(scenarios[0]?.failures[0]).toMatch(
      /no baseline at design\/notes-page\/baselines\/baseline-me-chromium-.*\.png: create it deliberately with `pnpm design regress notes-page --update`/,
    );
    expect(outcome.ok).toBe(false);
    expect(calls.find((c) => c[0]?.endsWith('playwright'))).not.toContain(
      '--update-snapshots=all',
    );

    run({ mode: 'regression', update: true, label: 'update' });
    expect(calls.filter((c) => c[0]?.endsWith('playwright')).at(-1)).toContain(
      '--update-snapshots=all',
    );
  });

  it('writes a page per task and an index when one regression run covers several tasks', () => {
    const raw = withChanges(completePlan(), {
      'captures.0.regression': true,
    });
    const other = withChanges(raw, { task: 'notes-two' });
    const { run, project } = setup(() => captured, { raw });
    project.write('design/notes-two/references/desktop.png', makePng(400, 300));
    const outcome = run({
      mode: 'regression',
      plans: [
        { plan: parse(raw), source: JSON.stringify(raw) },
        { plan: parse(other), source: JSON.stringify(other) },
      ],
    });
    expect(outcome.runs.map((r) => r.task)).toEqual([
      'notes-page',
      'notes-two',
    ]);
    const dir = 'reports/design/_regression/run-1';
    const index = project.read(`${dir}/report.html`);
    expect(index).toContain('href="notes-page.html"');
    expect(index).toContain('href="notes-two.html"');
    for (const task of ['notes-page', 'notes-two']) {
      const page = project.read(`${dir}/${task}.html`);
      expect(page.match(/<!doctype html>/g)).toHaveLength(1);
      expect(project.exists(`${dir}/references/${task}/desktop.png`)).toBe(
        task === 'notes-page' || task === 'notes-two',
      );
    }
  });

  it('compares every scroll position with its own baseline and names the missing ones', () => {
    const raw = withChanges(completePlan(), {
      'captures.0.regression': true,
      'captures.0.extent': 'scroll',
    });
    const { run, project } = setup(
      () => ({
        ...captured,
        screenshots: [
          { file: 'a.png', scrollTop: 0 },
          { file: 'b.png', scrollTop: 900 },
        ],
        regression: {
          error:
            "A snapshot doesn't exist at /tmp/x/design/notes-page/baselines/desktop-content-chromium-linux.png.",
          errors: [
            "A snapshot doesn't exist at /tmp/x/design/notes-page/baselines/desktop-content-chromium-linux.png.",
            "A snapshot doesn't exist at /tmp/x/design/notes-page/baselines/desktop-content--scroll-1-chromium-linux.png.",
          ],
        },
      }),
      { raw },
    );
    const scenario = run({ mode: 'regression' }).runs[0]?.report.scenarios[0];
    // Added screenshots fail like any missing baseline, and none is written.
    expect(scenario?.status).toBe('missing');
    expect(scenario?.screenshotSet?.disappeared).toEqual([]);
    expect(project.exists('design/notes-page/baselines')).toBe(false);
    expect(scenario?.baselines).toEqual([
      `design/notes-page/baselines/desktop-content-chromium-${process.platform}.png`,
      `design/notes-page/baselines/desktop-content--scroll-1-chromium-${process.platform}.png`,
    ]);
    expect(scenario?.failures[0]).toMatch(
      /^no baseline at design\/notes-page\/baselines\/desktop-content-chromium-linux\.png, design\/notes-page\/baselines\/desktop-content--scroll-1-chromium-linux\.png: create it deliberately/,
    );
  });

  describe('the screenshot set', () => {
    const platform = process.platform;
    const other = platform === 'linux' ? 'darwin' : 'linux';
    const base = 'design/notes-page/baselines';
    /** The reviewed set of desktop-content: three scroll positions. */
    const reviewed = [0, 1, 2].map(
      (n) =>
        `${base}/desktop-content${n ? `--scroll-${n}` : ''}-chromium-${platform}.png`,
    );
    /** Baselines that are not desktop-content's on this browser and platform. */
    const unrelated = [
      `${base}/desktop-content--scroll-1-webkit-${platform}.png`,
      `${base}/desktop-content--scroll-1-chromium-${other}.png`,
      `${base}/desktop-content-wide--scroll-1-chromium-${platform}.png`,
      `design/notes-two/baselines/desktop-content--scroll-1-chromium-${platform}.png`,
    ];
    /**
     * A shortened page: the render now produces `count` screenshots, all
     * matching. With `update`, the fake Playwright writes them as
     * `--update-snapshots=all` would.
     */
    const shortened = (count = 1, overrides = {}) => {
      const raw = withChanges(completePlan(), {
        'captures.0.regression': true,
        'captures.0.extent': 'scroll',
      });
      /** @type {{ update: boolean, during?: () => void }} */
      const state = { update: false };
      const setupResult = setup(
        () => {
          if (state.update) {
            for (const file of reviewed.slice(0, count)) {
              setupResult.project.write(file, makePng(12, 9));
            }
          }
          state.during?.();
          return {
            ...captured,
            screenshots: Array.from({ length: count }, (_, n) => ({
              file: `shot-${n}.png`,
              scrollTop: n * 900,
            })),
            regression: { error: null, errors: [] },
            ...overrides,
          };
        },
        { raw },
      );
      const { project } = setupResult;
      reviewed.forEach((file, n) => project.write(file, makePng(12 + n, 9)));
      unrelated.forEach((file, n) => project.write(file, makePng(20 + n, 9)));
      /** Every baseline file and its bytes. */
      const baselines = () =>
        Object.fromEntries(
          [...reviewed, ...unrelated]
            .filter((file) => project.exists(file))
            .map((file) => [
              file,
              fs.readFileSync(path.join(project.root, file)).toString('base64'),
            ]),
        );
      return { ...setupResult, state, baselines };
    };

    it('fails when reviewed screenshots disappear although the rest match, and changes no baseline', () => {
      const { run, project, baselines } = shortened();
      const before = baselines();
      const outcome = run({ mode: 'regression' });
      const report = outcome.runs[0]?.report;
      const scenario = report?.scenarios[0];
      expect(outcome.ok).toBe(false);
      expect(scenario?.status).toBe('different');
      expect(scenario?.failures).toEqual([
        `screenshot set changed: 2 reviewed screenshot(s) no longer produced (${reviewed[1]}, ${reviewed[2]}); this render has 1 of the 3 reviewed. Content at the end of the page is gone or shorter: if that is intended, review the render and run \`pnpm design regress notes-page --update\``,
      ]);
      expect(scenario?.screenshotSet).toEqual({
        reviewed,
        produced: [reviewed[0]],
        disappeared: [reviewed[1], reviewed[2]],
        images: [1, 2].map(
          (n) =>
            `reviewed/notes-page/desktop-content--scroll-${n}-chromium-${platform}.png`,
        ),
      });
      expect(baselines()).toEqual(before);
      const dir = 'reports/design/_regression/run-1';
      for (const image of scenario?.screenshotSet?.images ?? []) {
        expect(project.exists(`${dir}/${image}`)).toBe(true);
      }
      const json =
        /** @type {{ scenarios: Array<{ screenshotSet: unknown }> }} */ (
          parseJson(project.read(`${dir}/report.json`))
        );
      expect(json.scenarios[0]?.screenshotSet).toEqual(scenario?.screenshotSet);
      const html = project.read(`${dir}/report.html`);
      expect(html).toContain('<h3>Screenshot set</h3>');
      expect(html).toContain(
        `2 reviewed screenshot(s) no longer produced: this render has 1, the reviewed set 3.`,
      );
      expect(html).toContain(
        `src="reviewed/notes-page/desktop-content--scroll-2-chromium-${platform}.png"`,
      );
      expect(project.read(`${dir}/summary.md`)).toContain(
        '  - `desktop-content`: screenshot set changed, 2 reviewed screenshot(s) no longer produced (1 of 3)',
      );
    });

    it("--update removes only that scenario's baselines on this browser and platform, and the next run passes", () => {
      const { run, project, state, baselines } = shortened();
      const before = baselines();
      state.update = true;
      const updated = run({ mode: 'regression', update: true });
      const scenario = updated.runs[0]?.report.scenarios[0];
      expect(updated.ok).toBe(true);
      expect(scenario?.screenshotSet?.removed).toEqual([
        reviewed[1],
        reviewed[2],
      ]);
      expect(updated.messages).toContain(
        `Removed 2 baseline(s) notes-page/desktop-content no longer produces: ${reviewed[1]}, ${reviewed[2]} (copies in the run's reviewed/ folder).`,
      );
      const after = baselines();
      expect(Object.keys(after)).toEqual([reviewed[0], ...unrelated]);
      for (const file of unrelated) expect(after[file]).toBe(before[file]);
      // The removed images stay in the run's evidence.
      expect(
        project.exists(
          `reports/design/_regression/run-1/reviewed/notes-page/desktop-content--scroll-2-chromium-${platform}.png`,
        ),
      ).toBe(true);
      expect(
        project.read('reports/design/_regression/run-1/report.html'),
      ).toContain(
        `--update removed 2 reviewed baseline(s) this render no longer produces: ${reviewed[1]}, ${reviewed[2]}.`,
      );

      state.update = false;
      const next = run({ mode: 'regression' });
      expect(next.ok).toBe(true);
      expect(next.runs[0]?.report.scenarios[0]).toMatchObject({
        status: 'matched',
        failures: [],
        screenshotSet: { reviewed: [reviewed[0]], disappeared: [] },
      });
      expect(baselines()).toEqual(after);
    });

    it('--update keeps the set when the scenario failed', () => {
      const { run, state, baselines } = shortened(1, {
        a11y: [
          {
            id: 'label',
            impact: 'serious',
            help: 'Labels',
            targets: ['input'],
          },
        ],
      });
      const before = baselines();
      state.update = true;
      const outcome = run({ mode: 'regression', update: true });
      expect(outcome.ok).toBe(false);
      expect(outcome.runs[0]?.report.scenarios[0]?.failures).toContain(
        `the 2 reviewed baseline(s) this render no longer produces were kept (${reviewed[1]}, ${reviewed[2]}): the scenario failed, so its set was not updated`,
      );
      expect(Object.keys(baselines())).toEqual(Object.keys(before));
    });

    it('checks every baseline it would remove again before removing any', () => {
      const { run, project, state, baselines } = shortened();
      state.update = true;
      // A link appears where a baseline was, after the check before the run.
      state.during = () => {
        fs.rmSync(path.join(project.root, reviewed[2] ?? ''));
        fs.symlinkSync(
          path.join(project.root, 'src/globals/paths.ts'),
          path.join(project.root, reviewed[2] ?? ''),
        );
      };
      const source = project.read('src/globals/paths.ts');
      const outcome = run({ mode: 'regression', update: true });
      const scenario = outcome.runs[0]?.report.scenarios[0];
      expect(outcome.ok).toBe(false);
      expect(scenario?.status).toBe('failed');
      expect(scenario?.failures).toEqual([
        `${reviewed[2]} is a symlink (to src/globals/paths.ts); design commands do not write through links. Make ${reviewed[2]} a real file inside the project.`,
      ]);
      expect(scenario?.screenshotSet?.removed).toBeUndefined();
      // Nothing removed: neither the other obsolete baseline nor the link.
      expect(Object.keys(baselines())).toContain(reviewed[1]);
      expect(
        fs
          .lstatSync(path.join(project.root, reviewed[2] ?? ''))
          .isSymbolicLink(),
      ).toBe(true);
      expect(project.read('src/globals/paths.ts')).toBe(source);
    });
  });

  it('says when there is nothing to compare', () => {
    const { run } = setup(() => captured);
    expect(run({ mode: 'regression' })).toMatchObject({
      ok: true,
      messages: ['No regression scenarios ("regression": true) to check.'],
    });
    expect(run({ scenarioIds: ['nope'] })).toMatchObject({
      ok: false,
      messages: ['Unknown capture scenario(s): nope.'],
    });
  });

  it('classifies screenshot comparison failures', () => {
    expect(classifyRegression("A snapshot doesn't exist at /a.png.")).toBe(
      'missing',
    );
    expect(
      classifyRegression(
        'Screenshot comparison failed:\n  1234 pixels (ratio 0.01 of all image pixels) are different.',
      ),
    ).toBe('different');
    expect(
      classifyRegression(
        'Expected an image 1200px by 900px, received 1200px by 950px. 99 pixels (ratio 0.01 of all image pixels) are different.',
      ),
    ).toBe('different');
    expect(classifyRegression('Timeout 5000ms exceeded')).toBe('failed');
  });
});
