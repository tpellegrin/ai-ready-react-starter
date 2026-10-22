import fs from 'node:fs';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { classifyRegression, runScenarios } from './capture.mjs';
import { compareGeometry, sides } from './geometry.mjs';
import { parsePlan } from './plan.mjs';
import { escapeHtml, planSummary, runReportHtml } from './report.mjs';
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
   * @param {{ start?: 'fail' | 'ok', output?: string, raw?: unknown }} [options]
   */
  const setup = (
    write,
    { start = 'ok', output = '', raw = completePlan() } = {},
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
      return { status: 0, stdout: output };
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
