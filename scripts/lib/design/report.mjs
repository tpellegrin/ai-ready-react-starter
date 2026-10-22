// @ts-check
/**
 * Readable output derived from a plan and from capture runs: a Markdown
 * summary of the plan (`pnpm design check --summary`), and per run an HTML
 * comparison report plus a Markdown summary for pull requests. Everything
 * that comes from a plan, a reference's file name, a page or a browser is
 * untrusted text and is escaped; reports load nothing from the network.
 *
 * Three kinds of statement stay apart everywhere: mechanical results (what
 * the tools measured), agent observations (what the agent recorded in the
 * plan's review) and human review (recorded by a person; tools never set it).
 */

import { describeSides } from './geometry.mjs';

/**
 * @typedef {import('./plan.mjs').Plan} Plan
 * @typedef {import('./plan.mjs').Mapping} Mapping
 * @typedef {import('./geometry.mjs').Geometry} Geometry
 */

const HTML_ESCAPES = /** @type {Record<string, string>} */ ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
});

/** Any value as text: strings as they are, other values as JSON. */
const toText = (/** @type {unknown} */ value) =>
  typeof value === 'string'
    ? value
    : typeof value === 'number' || typeof value === 'boolean'
      ? String(value)
      : value === null || value === undefined
        ? ''
        : JSON.stringify(value);

/** @param {unknown} value */
export const escapeHtml = (value) =>
  toText(value).replace(/[&<>"']/g, (c) => HTML_ESCAPES[c] ?? c);

/**
 * Text for a Markdown line or table cell: no HTML (tags, entities), no
 * pipes, code spans, links or line breaks.
 */
const escapeMarkdown = (/** @type {unknown} */ value) =>
  toText(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/[|`[\]]/g, (c) => `\\${c}`)
    .replace(/\s*\n\s*/g, ' ');

/** Marks trusted, already-escaped HTML. */
class Raw {
  /** @param {string} value */
  constructor(value) {
    this.value = value;
  }
}
/** @param {string} value */
const raw = (value) => new Raw(value);

/**
 * HTML template: interpolations are escaped unless built with `html` or
 * `raw`; arrays are joined.
 * @param {TemplateStringsArray} strings
 * @param {unknown[]} values
 */
const html = (strings, ...values) =>
  raw(
    strings.reduce((out, string, index) => {
      if (index === 0) return string;
      const value = values[index - 1];
      const items = Array.isArray(value) ? value : [value];
      return `${out}${items
        .map((item) => (item instanceof Raw ? item.value : escapeHtml(item)))
        .join('')}${string}`;
    }, ''),
  );

/** One line describing how a region is built. */
export const describeMapping = (/** @type {Mapping | null} */ mapping) => {
  if (!mapping) return 'not mapped yet';
  switch (mapping.use) {
    case 'existing':
      return `${mapping.export} ('${mapping.import}')`;
    case 'composition':
      return `composition of ${mapping.parts.map((p) => p.export).join(', ')}${mapping.wrapper ? ` in ${mapping.wrapper}` : ''}`;
    case 'extension':
      return `extension of ${mapping.export}: ${mapping.change} [${mapping.decision}]`;
    case 'new':
      return `new ${mapping.scope} component ${mapping.name}${mapping.composes.length ? ` (composes ${mapping.composes.map((p) => p.export).join(', ')})` : ''} [${mapping.decision}] — ${mapping.justification}`;
    case 'omitted':
      return `omitted: ${mapping.reason}`;
  }
};

/** observed / requirement / … with what it cites. */
const basisText = (
  /** @type {{ basis: string, references?: string[], requirements?: string[] }} */ item,
) => {
  const cites = [...(item.references ?? []), ...(item.requirements ?? [])];
  const label =
    item.basis === 'inferred' || item.basis === 'default'
      ? `${item.basis} (assumed)`
      : item.basis;
  return cites.length ? `${label}: ${cites.join(', ')}` : label;
};

/**
 * Markdown summary of a plan, for people and pull requests.
 * @param {Plan} plan
 * @param {{ ok: boolean, ready: boolean, diagnostics: Array<{ level: string, message: string }> }} [check]
 */
export const planSummary = (plan, check) => {
  const m = escapeMarkdown;
  /** @type {string[]} */
  const lines = [`# ${m(plan.title)} (\`${plan.task}\`)`, ''];
  if (check) {
    const open = check.diagnostics.filter((d) => d.level === 'open').length;
    const errors = check.diagnostics.filter((d) => d.level === 'error').length;
    lines.push(
      `Plan check: ${check.ok ? 'structure valid' : `${errors} error(s)`}; ${check.ready ? 'no open items' : `${open} open item(s) — not ready to implement`}. This describes the plan, not whether the page matches the references.`,
      '',
    );
  }
  lines.push(`**Request:** ${m(plan.request.summary)}`, '');
  for (const requirement of plan.request.requirements) {
    lines.push(`- \`${requirement.id}\` ${m(requirement.text)}`);
  }
  if (plan.request.requirements.length) lines.push('');

  lines.push(
    '## References',
    '',
    '| Id | File | Role | Fidelity | Image (px) | Viewport (CSS px) |',
    '| --- | --- | --- | --- | --- | --- |',
  );
  for (const ref of plan.references) {
    const target = [
      ref.screen && `screen ${ref.screen}`,
      ref.state && `state ${ref.state}`,
      ref.variantOf && `variant of ${ref.variantOf}`,
      ref.detailOf && `detail of ${ref.detailOf}`,
      ref.region && `region ${ref.region}`,
    ]
      .filter(Boolean)
      .join(', ');
    lines.push(
      `| \`${ref.id}\` | ${m(ref.file)} | ${m(ref.role ?? 'unassigned')}${target ? ` (${m(target)})` : ''} | ${m(ref.kind ?? 'unknown')} | ${ref.image.width}×${ref.image.height} ${ref.image.format} | ${ref.viewport ? `${ref.viewport.width}×${ref.viewport.height} @${ref.viewport.deviceScaleFactor}x (${ref.viewport.basis})` : 'not recorded'} |`,
    );
  }
  lines.push('');

  for (const screen of plan.screens) {
    lines.push(
      `## Screen \`${screen.id}\`: ${m(screen.title)}`,
      '',
      `Route \`${screen.route.path}\` (${screen.route.group}, ${screen.route.status}) · view \`src/views/${screen.route.group}/${screen.view}\`${screen.feature ? ` · feature \`${screen.feature}\`` : ''}`,
      '',
      `States: ${screen.states.map((s) => `${s.id} (${s.kind}; ${m(basisText(s))})`).join(' · ')}`,
      '',
      'Regions:',
      '',
    );
    /** @param {string | undefined} parent @param {number} depth */
    const tree = (parent, depth) => {
      for (const region of screen.regions.filter(
        (r) => (r.parent ?? undefined) === parent,
      )) {
        lines.push(
          `${'  '.repeat(depth)}- \`${region.id}\` ${m(region.label)} — ${m(basisText(region))} → ${m(describeMapping(region.component))}`,
        );
        tree(region.id, depth + 1);
      }
    };
    tree(undefined, 0);
    lines.push('');
    const interactions = plan.interactions.filter(
      (i) => i.screen === screen.id,
    );
    if (interactions.length) {
      lines.push('Interactions:', '');
      for (const item of interactions) {
        lines.push(
          `- ${m(item.trigger)} → ${m(item.result)}${item.keyboard ? ` (keyboard: ${m(item.keyboard)})` : ''} — ${m(basisText(item))}`,
        );
      }
      lines.push('');
    }
    const responsive = plan.responsive.filter((r) => r.screen === screen.id);
    if (responsive.length) {
      lines.push('Responsive behavior:', '');
      for (const item of responsive) {
        lines.push(
          `- ${m(item.when)}: ${m(item.behavior)} — ${m(basisText(item))}`,
        );
      }
      lines.push('');
    }
  }

  for (const flow of plan.flows) {
    lines.push(
      `Flow \`${flow.id}\` (${flow.group}): ${flow.steps.join(' → ')} — ${m(basisText(flow))}`,
      '',
    );
  }

  /** @param {string} title @param {string[]} items */
  const section = (title, items) => {
    if (!items.length) return;
    lines.push(`## ${title}`, '', ...items, '');
  };
  section(
    'Questions',
    plan.questions.map(
      (q) =>
        `- \`${q.id}\` ${q.blocking ? '**blocking** ' : ''}${m(q.text)} — ${q.status}${q.answer ? `: ${m(q.answer)}` : ''}`,
    ),
  );
  section(
    'Assumptions',
    plan.assumptions.map((a) => `- \`${a.id}\` ${m(a.text)} (${a.basis})`),
  );
  section(
    'Deviations from the references',
    plan.deviations.map(
      (d) =>
        `- \`${d.id}\` ${d.region ? `${d.screen}/${d.region}` : d.screen}: the reference shows ${m(d.observed)}; built: ${m(d.implemented)} (${d.reason})`,
    ),
  );
  section(
    'Acceptance criteria',
    plan.acceptance.map(
      (a) =>
        `- \`${a.id}\` ${m(a.text)} — ${a.verify}${a.where ? ` (${m(a.where)})` : ''}`,
    ),
  );
  section(
    'Capture scenarios',
    plan.captures.map(
      (c) =>
        `- \`${c.id}\` ${c.screen}/${c.state} at ${c.viewport.width}×${c.viewport.height} @${c.deviceScaleFactor}x, ${c.browser}${c.mobile ? ' (mobile)' : ''}, ${c.locale}, ${c.session}${c.compare ? `, compared with \`${c.compare}\`` : ''}${c.regression ? ', regression baseline' : ''}`,
    ),
  );
  const review = plan.review;
  /** @type {string[]} */
  const reviewLines = review.rounds.flatMap((round) => [
    `- Round \`${round.id}\` (${m(round.focus)}): findings on run \`${round.before}\`${round.after ? `, result in \`${round.after}\`` : ''}; changes ${round.kept === null ? 'undecided' : round.kept ? 'kept' : 'reverted'}`,
    ...round.findings.map(
      (f) =>
        `  - \`${f.capture}\`${f.region ? `/${f.region}` : ''}: ${m(f.observed)}${f.change ? ` → ${m(f.change)}` : ''} (${f.status})`,
    ),
  ]);
  if (review.best) reviewLines.push(`- Best verified run: \`${review.best}\``);
  for (const item of review.remaining) {
    reviewLines.push(`- Remaining: ${m(item.text)}`);
  }
  reviewLines.push(
    `- Human review: **${review.human.status}**${review.human.by ? ` by ${m(review.human.by)}` : ''}${review.human.notes ? ` — ${m(review.human.notes)}` : ''}`,
  );
  section('Review (agent observations, then human status)', reviewLines);
  return `${lines.join('\n').trimEnd()}\n`;
};

/**
 * @typedef {{
 *   id: string, screen: string, state: string, compare: string | null,
 *   status: 'captured' | 'failed' | 'matched' | 'missing' | 'different',
 *   error?: string | undefined,
 *   screenshot?: string | undefined, referenceImage?: string | undefined,
 *   frame?: { width: number, height: number } | undefined,
 *   environment?: Record<string, unknown> | undefined,
 *   regions?: Array<{ id: string, label: string, mapping: string, box: { x: number, y: number, width: number, height: number } | null, reference: { x: number, y: number, width: number, height: number } | null }>,
 *   referenceFrame?: { width: number, height: number } | null,
 *   geometry?: Geometry | null,
 *   a11y?: Array<{ id: string, impact: string, help: string, targets: string[] }> | undefined,
 *   unexpectedRequests?: string[] | undefined,
 *   failures: string[],
 *   baseline?: string | undefined,
 *   comparison?: Record<string, string> | undefined,
 * }} ScenarioResult
 * @typedef {{
 *   task: string, title: string, label: string, mode: 'capture' | 'regression',
 *   createdAt: string, revision: { commit: string | null, uncommittedChanges: boolean },
 *   planSha256: string, ok: boolean, scenarios: ScenarioResult[],
 *   observations: Array<{ round: string, capture: string, region?: string | undefined, observed: string, change?: string | undefined, status: string }>,
 *   remaining: string[],
 *   deviations: Array<{ screen: string, region?: string | undefined, observed: string, implemented: string, reason: string }>,
 *   human: { status: string, by?: string | undefined, notes?: string | undefined },
 * }} RunReport
 */

const STYLE = `
:root { color-scheme: light dark; --fg: #1b1b1b; --muted: #5d5d5d; --bg: #fff; --line: #d4d4d4; --ok: #19663a; --bad: #a3271f; --note: #7a5400; --box: #d1006b; }
@media (prefers-color-scheme: dark) { :root { --fg: #ececec; --muted: #a8a8a8; --bg: #161616; --line: #3a3a3a; --ok: #6fd39a; --bad: #ff8f86; --note: #f0c36b; --box: #ff5cac; } }
body { margin: 0 auto; max-width: 80rem; padding: 1.5rem 1rem 4rem; font: 15px/1.5 system-ui, sans-serif; color: var(--fg); background: var(--bg); }
h1 { font-size: 1.5rem; margin: 0 0 .25rem; } h2 { font-size: 1.2rem; margin: 2.5rem 0 .5rem; border-top: 1px solid var(--line); padding-top: 1rem; } h3 { font-size: 1rem; margin: 1.25rem 0 .5rem; }
.muted { color: var(--muted); } .ok { color: var(--ok); } .bad { color: var(--bad); } .note { color: var(--note); }
table { border-collapse: collapse; width: 100%; font-size: .875rem; } th, td { text-align: left; vertical-align: top; padding: .3rem .5rem; border-bottom: 1px solid var(--line); }
.pair { display: grid; grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr)); gap: 1rem; align-items: start; }
figure { margin: 0; } figcaption { font-size: .8rem; color: var(--muted); margin-top: .25rem; }
.frame { position: relative; border: 1px solid var(--line); line-height: 0; }
.frame img { width: 100%; height: auto; display: block; }
.frame .over { position: absolute; top: 0; left: 0; mix-blend-mode: difference; }
.region { position: absolute; border: 2px solid var(--box); box-sizing: border-box; }
.region span { position: absolute; bottom: 100%; left: -2px; font: 600 11px/1.3 system-ui, sans-serif; background: var(--box); color: #fff; padding: 0 .25rem; white-space: nowrap; }
.chips span { display: inline-block; margin: 0 .5rem .25rem 0; padding: .1rem .5rem; border: 1px solid var(--line); border-radius: 999px; font-size: .8rem; }
details { margin: .75rem 0; } summary { cursor: pointer; }
`;

/** @param {number} value */
const pct = (value) => `${(value * 100).toFixed(1)}%`;

/**
 * Region boxes over an image, as percentages of its frame.
 * @param {Array<{ id: string, box: { x: number, y: number, width: number, height: number } | null }>} boxes
 * @param {{ width: number, height: number }} frame
 */
const overlays = (boxes, frame) =>
  boxes
    .filter((item) => item.box)
    .map((item) => {
      const box =
        /** @type {{ x: number, y: number, width: number, height: number }} */ (
          item.box
        );
      return html`<div
        class="region"
        style="${`left:${pct(box.x / frame.width)};top:${pct(box.y / frame.height)};width:${pct(box.width / frame.width)};height:${pct(box.height / frame.height)}`}"
      >
        <span>${item.id}</span>
      </div>`;
    });

/** @param {ScenarioResult} scenario */
const scenarioSection = (scenario, /** @type {RunReport} */ run) => {
  const geometry = scenario.geometry;
  const found =
    geometry?.regions.filter((r) => r.status === 'found').length ?? 0;
  const measured =
    geometry?.regions.filter((r) => r.status !== 'not-measured').length ?? 0;
  const mismatches =
    geometry?.relations.filter((r) => r.status === 'mismatch').length ?? 0;
  const deviations =
    geometry?.relations.filter((r) => r.status === 'deviation').length ?? 0;
  const statusClass =
    scenario.status === 'captured' || scenario.status === 'matched'
      ? scenario.failures.length
        ? 'bad'
        : 'ok'
      : 'bad';
  const environment = Object.entries(scenario.environment ?? {});
  const observations = run.observations.filter(
    (o) => o.capture === scenario.id,
  );
  const frame = scenario.frame;
  const referenceFrame = scenario.referenceFrame;
  return html`<section id="${scenario.id}">
    <h2>
      ${scenario.id}
      <span class="muted">— ${scenario.screen} / ${scenario.state}</span>
    </h2>
    <p class="chips">
      <span class="${statusClass}">${scenario.status}</span>${geometry
        ? html`<span>regions found ${found}/${measured}</span
            ><span
              >arrangement: ${mismatches} mismatch(es), ${deviations} documented
              deviation(s)</span
            >`
        : ''}${scenario.a11y
        ? html`<span>axe violations: ${scenario.a11y.length}</span>`
        : ''}${scenario.compare
        ? html`<span>compared with reference ${scenario.compare}</span>`
        : html`<span>no reference comparison</span>`}
    </p>
    ${scenario.error ? html`<p class="bad">${scenario.error}</p>` : ''}
    ${scenario.comparison
      ? html`<h3>Baseline comparison (Playwright)</h3>
          <div class="pair">
            ${['expected', 'actual', 'diff']
              .filter((kind) => scenario.comparison?.[kind])
              .map(
                (kind) =>
                  html`<figure>
                    <div class="frame">
                      <img src="${scenario.comparison?.[kind]}" alt="${kind}" />
                    </div>
                    <figcaption>${kind}</figcaption>
                  </figure>`,
              )}
          </div>`
      : ''}
    ${scenario.failures.length
      ? html`<h3>Mechanical failures</h3>
          <ul>
            ${scenario.failures.map((f) => html`<li class="bad">${f}</li>`)}
          </ul>`
      : ''}
    ${scenario.screenshot && frame
      ? html`<div class="pair">
            ${scenario.referenceImage && referenceFrame
              ? html`<figure>
                  <div class="frame">
                    <img
                      src="${scenario.referenceImage}"
                      alt="${`Reference ${scenario.compare ?? ''}`}"
                    />${overlays(
                      (scenario.regions ?? []).map((r) => ({
                        id: r.id,
                        box: r.reference,
                      })),
                      referenceFrame,
                    )}
                  </div>
                  <figcaption>
                    Reference ${scenario.compare}
                    (${referenceFrame.width}×${referenceFrame.height} image px),
                    boxes from the plan's approximate bounds
                  </figcaption>
                </figure>`
              : ''}
            <figure>
              <div class="frame">
                <img
                  src="${scenario.screenshot}"
                  alt="${`Render ${scenario.id}`}"
                />${overlays(
                  (scenario.regions ?? []).map((r) => ({
                    id: r.id,
                    box: r.box,
                  })),
                  frame,
                )}
              </div>
              <figcaption>
                Render (${frame.width}×${frame.height} CSS px), boxes measured
                in the browser
              </figcaption>
            </figure>
          </div>
          ${scenario.referenceImage
            ? html`<details>
                <summary>
                  Overlay (difference blend, same width, top-left aligned;
                  nothing stretched)
                </summary>
                <div class="frame">
                  <img src="${scenario.screenshot}" alt="" /><img
                    class="over"
                    src="${scenario.referenceImage}"
                    alt=""
                  />
                </div>
              </details>`
            : ''}`
      : ''}
    ${geometry
      ? html`<h3>Regions (measured)</h3>
          <table>
            <thead>
              <tr>
                <th>Region</th>
                <th>Built with</th>
                <th>Status</th>
                <th>
                  Left / width / height as share of frame width: reference →
                  render
                </th>
              </tr>
            </thead>
            <tbody>
              ${geometry.regions.map((region) => {
                const info = scenario.regions?.find((r) => r.id === region.id);
                const size = region.size;
                return html`<tr>
                  <td>
                    ${region.id}<br /><span class="muted">${region.label}</span>
                  </td>
                  <td>${info?.mapping ?? ''}</td>
                  <td
                    class="${region.status === 'found'
                      ? 'ok'
                      : region.status === 'not-measured'
                        ? 'muted'
                        : 'bad'}"
                  >
                    ${region.status}
                  </td>
                  <td>
                    ${size
                      ? html`<span class="${region.sizeDiffers ? 'note' : ''}"
                          >${pct(size.reference.left)} /
                          ${pct(size.reference.width)} /
                          ${pct(size.reference.height)} →
                          ${pct(size.render.left)} / ${pct(size.render.width)} /
                          ${pct(size.render.height)}</span
                        >`
                      : html`<span class="muted">—</span>`}
                  </td>
                </tr>`;
              })}
            </tbody>
          </table>
          ${geometry.relations.some((r) => r.status !== 'match')
            ? html`<h3>Arrangement differences</h3>
                <ul>
                  ${geometry.relations
                    .filter((r) => r.status !== 'match')
                    .map(
                      (r) =>
                        html`<li
                          class="${r.status === 'mismatch' ? 'bad' : 'note'}"
                        >
                          ${r.a} is ${describeSides(r.reference)} ${r.b} in the
                          reference, ${describeSides(r.render)} it in the render
                          (${r.status === 'deviation'
                            ? 'documented deviation'
                            : 'mismatch'})
                        </li>`,
                    )}
                </ul>`
            : html`<p class="muted">
                ${geometry.relations.length} sibling arrangement(s) compared;
                all match the reference.
              </p>`}`
      : ''}
    ${scenario.a11y?.length
      ? html`<h3>Accessibility (axe)</h3>
          <ul>
            ${scenario.a11y.map(
              (v) =>
                html`<li class="bad">
                  ${v.id} (${v.impact}): ${v.help} — ${v.targets.join(', ')}
                </li>`,
            )}
          </ul>`
      : ''}
    ${scenario.unexpectedRequests?.length
      ? html`<h3>Undeclared requests</h3>
          <ul>
            ${scenario.unexpectedRequests.map(
              (r) => html`<li class="bad">${r}</li>`,
            )}
          </ul>`
      : ''}
    <h3>Agent observations (from the plan's review, not measured)</h3>
    ${observations.length
      ? html`<ul>
          ${observations.map(
            (o) =>
              html`<li>
                [${o.round}]
                ${o.region ? `${o.region}: ` : ''}${o.observed}${o.change
                  ? html` → <em>${o.change}</em>`
                  : ''}
                (${o.status})
              </li>`,
          )}
        </ul>`
      : html`<p class="muted">None recorded for this capture.</p>`}
    ${environment.length
      ? html`<details>
          <summary>Scenario and environment</summary>
          <table>
            <tbody>
              ${environment.map(
                ([key, value]) =>
                  html`<tr>
                    <th>${key}</th>
                    <td>
                      ${typeof value === 'string'
                        ? value
                        : JSON.stringify(value)}
                    </td>
                  </tr>`,
              )}
            </tbody>
          </table>
        </details>`
      : ''}
  </section>`;
};

/**
 * The HTML comparison report of one run.
 * @param {RunReport} run
 */
export const runReportHtml = (run) => {
  const failed = run.scenarios.filter(
    (s) => s.failures.length || !['captured', 'matched'].includes(s.status),
  );
  return `<!doctype html>
${
  html`<html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>${`Design evidence: ${run.task} / ${run.label}`}</title>
      <style>
        ${raw(STYLE)}
      </style>
    </head>
    <body>
      <h1>${run.title}</h1>
      <p class="muted">
        Task ${run.task} · ${run.mode} run ${run.label} · ${run.createdAt} ·
        revision
        ${run.revision.commit ?? 'unknown'}${run.revision.uncommittedChanges
          ? ' (with uncommitted changes)'
          : ''}
        · plan sha256 ${run.planSha256.slice(0, 12)}
      </p>
      <table>
        <tbody>
          <tr>
            <th>Mechanical checks</th>
            <td class="${run.ok ? 'ok' : 'bad'}">
              ${run.ok
                ? `all ${run.scenarios.length} scenario(s) passed`
                : `${failed.length} of ${run.scenarios.length} scenario(s) failed: ${failed.map((s) => s.id).join(', ')}`}
            </td>
          </tr>
          <tr>
            <th>Agent observations</th>
            <td>
              ${run.observations.length} recorded in the plan's review;
              ${run.remaining.length} difference(s)
              left${run.remaining.length
                ? html`<ul>
                    ${run.remaining.map((text) => html`<li>${text}</li>`)}
                  </ul>`
                : ''}
            </td>
          </tr>
          <tr>
            <th>Human review</th>
            <td>
              ${run.human.status}${run.human.by
                ? ` by ${run.human.by}`
                : ''}${run.human.notes ? ` — ${run.human.notes}` : ''}
            </td>
          </tr>
        </tbody>
      </table>
      <p class="muted">
        This report is evidence. Passing mechanical checks does not mean the
        page matches the references, and nothing here means a person approved
        the design.
      </p>
      ${run.deviations.length
        ? html`<h2>Documented deviations</h2>
            <ul>
              ${run.deviations.map(
                (d) =>
                  html`<li>
                    ${d.region ? `${d.screen}/${d.region}` : d.screen}:
                    reference shows ${d.observed}; built ${d.implemented}
                    (${d.reason})
                  </li>`,
              )}
            </ul>`
        : ''}
      ${run.scenarios.map((scenario) => scenarioSection(scenario, run))}
    </body>
  </html>`.value
}
`;
};

/**
 * Markdown summary of one run, for a pull request.
 * @param {RunReport} run
 * @param {string} reportPath  where the HTML report is
 */
export const runSummaryMarkdown = (run, reportPath) => {
  const m = escapeMarkdown;
  const lines = [
    `### Design evidence: \`${run.task}\`, ${run.mode} run \`${run.label}\``,
    '',
    `Revision \`${run.revision.commit?.slice(0, 12) ?? 'unknown'}\`${run.revision.uncommittedChanges ? ' (uncommitted changes)' : ''} · ${run.createdAt} · report: \`${reportPath}\``,
    '',
    '| Scenario | Compared with | Status | Regions found | Arrangement mismatches | axe violations |',
    '| --- | --- | --- | --- | --- | --- |',
    ...run.scenarios.map((s) => {
      const regions = s.geometry?.regions ?? [];
      return `| \`${s.id}\` | ${s.compare ? `\`${s.compare}\`` : '—'} | ${s.status}${s.failures.length ? ` (${s.failures.length} failure(s))` : ''} | ${regions.length ? `${regions.filter((r) => r.status === 'found').length}/${regions.filter((r) => r.status !== 'not-measured').length}` : '—'} | ${s.geometry ? s.geometry.relations.filter((r) => r.status === 'mismatch').length : '—'} | ${s.a11y ? s.a11y.length : '—'} |`;
    }),
    '',
    `- Mechanical checks: ${run.ok ? 'passed' : 'failed'}.`,
    `- Agent observations: ${run.observations.length} (plan review); remaining differences: ${run.remaining.length || 'none recorded'}`,
    ...run.remaining.map((text) => `  - ${m(text)}`),
    `- Human review: ${m(run.human.status)}.`,
  ];
  return `${lines.join('\n')}\n`;
};

/**
 * Index of a task's runs (regenerated; the runs themselves never change).
 * @param {string} task
 * @param {Array<{ label: string, href: string, mode: string, createdAt: string, ok: boolean, commit: string | null }>} runs
 */
export const indexHtml = (task, runs) =>
  `<!doctype html>
${
  html`<html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>${`Design evidence: ${task}`}</title>
      <style>
        ${raw(STYLE)}
      </style>
    </head>
    <body>
      <h1>Design evidence: ${task}</h1>
      <table>
        <thead>
          <tr>
            <th>Run</th>
            <th>Mode</th>
            <th>Created</th>
            <th>Revision</th>
            <th>Mechanical checks</th>
          </tr>
        </thead>
        <tbody>
          ${runs.map(
            (r) =>
              html`<tr>
                <td><a href="${r.href}">${r.label}</a></td>
                <td>${r.mode}</td>
                <td>${r.createdAt}</td>
                <td>${r.commit?.slice(0, 12) ?? 'unknown'}</td>
                <td class="${r.ok ? 'ok' : 'bad'}">
                  ${r.ok ? 'passed' : 'failed'}
                </td>
              </tr>`,
          )}
        </tbody>
      </table>
    </body>
  </html>`.value
}
`;
