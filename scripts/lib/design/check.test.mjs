import { afterEach, describe, expect, it } from 'vitest';

import { checkTask, listTasks, moduleBindings } from './check.mjs';
import { lineOf } from './plan.mjs';
import {
  DESKTOP,
  completePlan,
  createProject,
  fakeCatalog,
  makeJpegHeader,
  makePng,
  projectWithPlan,
  withChanges,
} from './testing.mjs';

/** @type {Array<() => void>} */
const cleanups = [];
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
});

const plan = completePlan();
const capture = plan.captures[0];

/**
 * Checks the complete plan with `changes` (dotted paths, see withChanges) in
 * a fresh temporary project.
 * @param {Record<string, unknown>} [changes]
 * @param {(project: ReturnType<typeof projectWithPlan>) => void} [prepare]
 */
const check = (changes = {}, prepare) => {
  const project = projectWithPlan(withChanges(plan, changes));
  cleanups.push(project.cleanup);
  prepare?.(project);
  const result = checkTask(project.root, 'notes-page', {
    catalog: fakeCatalog,
  });
  const at = (/** @type {string} */ level) =>
    result.diagnostics.filter((d) => d.level === level).map((d) => d.message);
  return {
    result,
    project,
    errors: at('error'),
    warnings: at('warning'),
    open: at('open'),
  };
};

describe('pnpm design check', () => {
  it('accepts a complete plan: valid, ready, nothing to report', () => {
    const { result } = check();
    expect(result.diagnostics).toEqual([]);
    expect(result).toMatchObject({ ok: true, ready: true });
  });

  it('is read-only', () => {
    const project = projectWithPlan();
    cleanups.push(project.cleanup);
    const before = project.snapshot();
    checkTask(project.root, 'notes-page', { catalog: fakeCatalog });
    expect(project.snapshot()).toBe(before);
  });

  it('lists tasks that have a plan', () => {
    const project = projectWithPlan();
    cleanups.push(project.cleanup);
    project.write('design/notes/README.md', 'no plan here');
    expect(listTasks(project.root)).toEqual(['notes-page']);
  });

  describe('malformed plans', () => {
    it('reports invalid JSON', () => {
      const project = createProject();
      cleanups.push(project.cleanup);
      project.write('design/broken/plan.json', '{ "schemaVersion": 1,');
      const result = checkTask(project.root, 'broken', {
        catalog: fakeCatalog,
      });
      expect(result.ok).toBe(false);
      expect(result.diagnostics[0]?.message).toMatch(/^not valid JSON/);
    });

    it('refuses unknown keys (nothing in a plan is executed), wrong values and future versions', () => {
      const { errors, result } = check({
        'captures.0.run': 'rm -rf /',
        'screens.0.states.0.kind': 'happy',
      });
      expect(result.ok).toBe(false);
      expect(errors.join('\n')).toMatch(/Unrecognized key: "run"/);
      expect(errors.join('\n')).toMatch(/Invalid option/);

      expect(check({ schemaVersion: 2 }).errors).toEqual([
        expect.stringMatching(/schemaVersion 2 is not supported/),
      ]);
    });

    it('points at the line of the problem', () => {
      const { result, project } = check({ 'screens.0.regions.1.label': '' });
      const diagnostic = result.diagnostics.find((d) =>
        d.path?.endsWith('label'),
      );
      const text = project.read('design/notes-page/plan.json');
      expect(diagnostic?.path).toBe('screens[0].regions[1].label');
      expect(text.split('\n')[(diagnostic?.line ?? 0) - 1]).toContain(
        '"label": ""',
      );
    });

    it('refuses a task name that does not match the folder', () => {
      expect(check({ task: 'other-task' }).errors).toContainEqual(
        expect.stringMatching(/folder is design\/notes-page/),
      );
    });

    it('refuses capture steps and locators that cannot be run', () => {
      const { errors } = check({
        'captures.0.steps': [
          { action: 'click' },
          { action: 'eval', value: 'x' },
        ],
        'captures.0.ready': [{ role: 'heading', label: 'Notes' }],
      });
      expect(errors.join('\n')).toMatch(/this action needs a target/);
      expect(errors.join('\n')).toMatch(/Invalid option/);
      expect(errors.join('\n')).toMatch(
        /exactly one of role, label, text or testId/,
      );
    });
  });

  describe('references', () => {
    it('reports a missing or empty image and says attachments are not files', () => {
      const empty = check({}, (project) =>
        project.write('design/notes-page/references/desktop.png', ''),
      );
      expect(empty.errors.join('\n')).toMatch(
        /desktop\.png: not a PNG or JPEG/,
      );

      expect(
        check({ 'references.0.file': 'references/gone.png' }).errors,
      ).toContainEqual(
        expect.stringMatching(
          /gone\.png: not found\. Save the image there \(attachments in a chat are not files/,
        ),
      );
    });

    it('reports a stale image: changed since the plan was written', () => {
      const { errors } = check({}, (project) =>
        project.write(
          'design/notes-page/references/desktop.png',
          makePng(400, 301),
        ),
      );
      expect(errors).toContainEqual(
        expect.stringMatching(
          /is not the image this plan was written from \(now png 400×301, sha256 [a-f0-9]{64}\)/,
        ),
      );
    });

    it('checks the bytes, not the extension', () => {
      const { errors } = check({}, (project) =>
        project.write('design/notes-page/references/desktop.png', '<svg/>'),
      );
      expect(errors).toContainEqual(
        expect.stringMatching(/not a PNG or JPEG image \(checked its bytes\)/),
      );
    });

    it('reads JPEG dimensions', () => {
      const { errors } = check(
        {
          'references.0.file': 'references/desktop.jpg',
          'references.0.image': { format: 'jpeg', width: 640, height: 480 },
        },
        (project) =>
          project.write(
            'design/notes-page/references/desktop.jpg',
            makeJpegHeader(640, 480),
          ),
      );
      // Only the hash differs from what the test plan recorded.
      expect(errors).toEqual([expect.stringMatching(/now jpeg 640×480/)]);
    });

    it('refuses paths outside the task references folder', () => {
      for (const file of [
        '../../src/main.tsx',
        '/etc/hosts',
        'plan.json',
        'references/../plan.json',
      ]) {
        expect(
          check({ 'references.0.file': file }).errors,
          file,
        ).toContainEqual(
          expect.stringMatching(/inside references\/ of the task folder/),
        );
      }
    });

    it('warns about images the plan does not list, and about the same image twice', () => {
      const { warnings } = check(
        {
          'references.1.file': 'references/copy.png',
          'references.1.sha256': plan.references[0]?.sha256,
          'references.1.image': { format: 'png', width: 400, height: 300 },
        },
        (project) => {
          project.write('design/notes-page/references/copy.png', DESKTOP);
          project.write(
            'design/notes-page/references/extra.png',
            makePng(10, 10),
          );
        },
      );
      expect(warnings).toContainEqual(
        expect.stringMatching(/extra\.png is not in the plan/),
      );
      expect(warnings).toContainEqual(
        expect.stringMatching(/Same image as reference "desktop"/),
      );
      expect(warnings).toContainEqual(
        expect.stringMatching(/mobile\.png is not in the plan/),
      );
    });

    it('warns when image pixels and the stated viewport disagree (image pixels are not CSS pixels)', () => {
      expect(
        check({ 'references.1.viewport.deviceScaleFactor': 3 }).warnings,
      ).toContainEqual(
        expect.stringMatching(
          /400 px wide; at device scale factor 3 that is 133 CSS px, not the 200 px viewport/,
        ),
      );
    });

    it('requires what each role refers to', () => {
      const { errors } = check({
        'references.1.variantOf': undefined,
        'references.0.role': 'state',
      });
      expect(errors).toContainEqual(
        'Role "responsive-variant" needs "variantOf" (the reference it is a variant of).',
      );
      expect(errors).toContainEqual(
        'Role "state" needs "state" (the state it shows).',
      );
    });
  });

  describe('ids and cross-references', () => {
    it('reports duplicate ids', () => {
      const { errors } = check({
        'references.1.id': 'desktop',
        'screens.0.regions.2.id': 'actions',
        'captures.1': capture,
      });
      expect(errors).toEqual(
        expect.arrayContaining([
          'Duplicate reference id "desktop".',
          'Duplicate region id "actions".',
          'Duplicate capture id "desktop-content".',
        ]),
      );
    });

    it('reports references to things that do not exist', () => {
      const { errors } = check({
        'screens.0.regions.1.parent': 'nowhere',
        'screens.0.regions.2.states': ['empty'],
        'interactions.0.region': 'toolbar',
        'captures.0.state': 'error',
        'captures.0.compare': 'tablet',
        'deviations.0.reference': 'figma',
        'review.rounds': [
          {
            id: 'round-1',
            focus: 'layout',
            before: 'initial',
            findings: [
              {
                id: 'f1',
                capture: 'mobile-content',
                observed: 'x',
                status: 'open',
              },
            ],
          },
        ],
      });
      expect(errors).toEqual(
        expect.arrayContaining([
          'Parent "nowhere" is not another region of screen "notes".',
          'Screen "notes" has no state "empty".',
          'Screen "notes" has no region "toolbar".',
          'Screen "notes" has no state "error".',
          'Reference "tablet" is not defined.',
          'Reference "figma" is not defined.',
          'Capture "mobile-content" is not defined.',
        ]),
      );
    });

    it('reports a region that is its own ancestor', () => {
      expect(
        check({ 'screens.0.regions.0.parent': 'list' }).errors,
      ).toContainEqual(expect.stringMatching(/is its own ancestor/));
    });

    it('needs evidence for what is observed or required', () => {
      const { errors } = check({
        'screens.0.regions.0.references': [],
        'interactions.0.requirements': [],
        'screens.0.states.0.references': ['sketch-2'],
      });
      expect(errors).toEqual(
        expect.arrayContaining([
          'An observed item cites the reference(s) it is seen in ("references" or "bounds").',
          'A requirement cites its id in "requirements".',
          'Reference "sketch-2" is not defined.',
        ]),
      );
    });

    it('checks bounds against the cited reference', () => {
      const { errors, warnings } = check({
        'screens.0.regions.1.bounds': { desktop: [300, 20, 200, 30] },
        'screens.0.regions.2.bounds': {
          desktop: [0, 0, 0, 10],
          ghost: [0, 0, 1, 1],
        },
      });
      expect(warnings).toContainEqual(
        'The box extends past the 400×300 image.',
      );
      expect(errors).toEqual(
        expect.arrayContaining([
          'Bounds are [x, y, width, height] with a positive size.',
          'Reference "ghost" is not defined.',
        ]),
      );
    });

    it('does not take flow order from anything but evidence', () => {
      const { open, errors } = check({
        flows: [
          {
            id: 'notes',
            group: 'user',
            steps: ['notes', 'notes'],
            basis: 'inferred',
          },
        ],
      });
      expect(open).toContainEqual(
        expect.stringMatching(
          /order of flow "notes" is inferred: confirm it \(file names and attachment order are not evidence of order\)/,
        ),
      );
      expect(errors).toContainEqual(
        expect.stringMatching(/flow steps live at \/flow\/notes\/<step>/),
      );
      expect(errors).toContainEqual('A flow lists each step once.');
    });
  });

  describe('component mappings', () => {
    /** @param {Record<string, unknown>} component */
    const mapped = (component) =>
      check({ 'screens.0.regions.2.component': component });

    it('refuses a building block that does not exist, and suggests the right import', () => {
      expect(
        mapped({
          use: 'existing',
          import: 'components/Typography',
          export: 'Text',
        }).errors,
      ).toEqual([
        "'components/Typography' is not a public building block; Text is exported by 'components/Text'. List them with `pnpm catalog`.",
      ]);
    });

    it('refuses internals: styles, logic, subfolders, _ elements and feature internals', () => {
      expect(
        mapped({
          use: 'existing',
          import: 'components/Button/styles',
          export: 'Root',
        }).errors,
      ).toEqual([
        expect.stringMatching(
          /'components\/Button\/styles' is inside Button: only its public API 'components\/Button' may be used/,
        ),
      ]);
      expect(
        mapped({
          use: 'existing',
          import: 'components/Button',
          export: '_ButtonRoot',
        }).errors,
      ).toEqual([
        expect.stringMatching(/_ButtonRoot is an internal styled element/),
      ]);
      expect(
        mapped({
          use: 'existing',
          import: 'features/notes/components/NoteRow',
          export: 'NoteRow',
        }).errors,
      ).toEqual([
        expect.stringMatching(
          /'features\/notes\/components\/NoteRow' is inside notes: only its public API 'features\/notes'/,
        ),
      ]);
    });

    it('refuses an export the module does not have, and types', () => {
      expect(
        mapped({
          use: 'existing',
          import: 'components/Button',
          export: 'IconButton',
        }).errors,
      ).toEqual([
        "'components/Button' does not export IconButton; it exports Button, ButtonProps.",
      ]);
      expect(
        mapped({
          use: 'existing',
          import: 'components/Button',
          export: 'ButtonProps',
        }).errors,
      ).toEqual([
        "ButtonProps from 'components/Button' is a type, not something to render.",
      ]);
    });

    it('checks every part of a composition', () => {
      const { errors } = mapped({
        use: 'composition',
        parts: [
          { import: 'components/CardBase', export: 'CardBase' },
          { import: 'components/Card', export: 'Card' },
        ],
      });
      expect(errors).toEqual([
        expect.stringMatching(
          /'components\/Card' is not a public building block/,
        ),
      ]);
    });

    it('keeps exports of a feature this task will generate open, asking to map them as new', () => {
      const { result, open } = check({
        'screens.0.feature': 'expenses',
        'screens.0.regions.2.component': {
          use: 'existing',
          import: 'features/expenses',
          export: 'ExpensesPanel',
        },
      });
      expect(result.ok).toBe(true);
      expect(open).toEqual([
        expect.stringMatching(
          /ExpensesPanel from 'features\/expenses' does not exist yet: map it as "use": "new" until `pnpm gen feature expenses`/,
        ),
      ]);
      expect(
        mapped({ use: 'existing', import: 'features/billing', export: 'X' })
          .errors,
      ).toEqual(["There is no feature 'features/billing' (planned: notes)."]);
    });

    it('refuses a proposed component that takes an existing name, and keeps open decisions open', () => {
      expect(
        mapped({
          use: 'new',
          name: 'Button',
          scope: 'shared',
          justification: 'needs a badge',
          decision: 'accepted',
        }).errors,
      ).toEqual([
        expect.stringMatching(/Button already exists \('components\/Button'\)/),
      ]);

      const proposed = mapped({
        use: 'new',
        name: 'NoteSummary',
        scope: 'feature',
        composes: [{ import: 'components/CardBase', export: 'CardBase' }],
        justification: 'Only this feature shows a summary.',
        decision: 'open',
      });
      expect(proposed.result.ok).toBe(true);
      expect(proposed.open).toEqual([
        expect.stringMatching(
          /Decide on the proposed feature component NoteSummary/,
        ),
      ]);

      expect(
        mapped({
          use: 'extension',
          import: 'components/Button',
          export: 'Button',
          change: 'an icon-only variant',
          justification: 'the toolbar shows icons',
          decision: 'open',
        }).open,
      ).toEqual([
        expect.stringMatching(/Decide on the proposed change to Button/),
      ]);
    });

    it('asks to map a component this task created as existing', () => {
      const { errors } = check(
        {
          'screens.0.regions.2.component': {
            use: 'new',
            name: 'NoteList',
            scope: 'feature',
            justification: 'x',
            decision: 'accepted',
          },
        },
        (project) =>
          project.write('src/features/notes/components/NoteList/index.tsx', ''),
      );
      expect(errors).toEqual([
        expect.stringMatching(
          /already exists\. If this task created it, map the region to it now/,
        ),
      ]);
    });

    it('warns about an omitted region without a deviation', () => {
      expect(mapped({ use: 'omitted', reason: 'decorative' }).warnings).toEqual(
        [expect.stringMatching(/omitted without a deviation/)],
      );
    });
  });

  describe('planned pages and routes', () => {
    it('refuses a path that is already declared, unless this task scaffolded it', () => {
      expect(
        check({
          'screens.0.route.path': '/archive',
          'screens.0.view': 'Archive',
        }).errors,
      ).toEqual([
        expect.stringMatching(
          /\/archive is already declared in src\/globals\/paths\.ts\. If this task scaffolded it, set "status": "existing"/,
        ),
        expect.stringMatching(
          /src\/views\/user\/Archive already exists\. If this task scaffolded it/,
        ),
        expect.stringMatching(/paths\.archive already exists/),
      ]);

      expect(
        check({
          'screens.0.route': {
            path: '/archive',
            group: 'user',
            status: 'existing',
          },
          'screens.0.view': 'Archive',
        }).errors,
      ).toEqual([]);
    });

    it('refuses an existing page that is not declared', () => {
      expect(check({ 'screens.0.route.status': 'existing' }).errors).toEqual([
        expect.stringMatching(
          /\/notes is not declared in src\/globals\/paths\.ts/,
        ),
        'src/views/user/Notes does not exist.',
      ]);
    });

    it('refuses a page name the route file already binds, even to an unrelated import', () => {
      expect(
        check({
          'screens.0.route.path': '/insights',
          'screens.0.view': 'Insights',
        }).errors,
      ).toEqual([
        "src/views/user/index.tsx already binds Insights (import from 'features/insights-legacy'); a page named Insights would collide with it there. Choose another name.",
      ]);
    });

    it('refuses a page named like a building block pages import', () => {
      expect(
        check({ 'screens.0.route.path': '/text', 'screens.0.view': 'Text' })
          .errors,
      ).toEqual([
        expect.stringMatching(
          /Text is a public building block \('components\/Text'\) that pages import/,
        ),
      ]);
    });
  });

  describe('captures', () => {
    it('checks locales, compared references and sessions', () => {
      const { errors, warnings } = check({
        'captures.0.locale': 'fr-FR',
        'captures.0.session': 'guest',
        'captures.1': {
          ...capture,
          id: 'mobile',
          compare: 'mobile',
          viewport: { width: 390, height: 844 },
        },
      });
      expect(errors).toEqual([
        'Locale "fr-FR" is not one of the project\'s (en-US, pseudo, pt-BR).',
      ]);
      expect(warnings).toEqual(
        expect.arrayContaining([
          expect.stringMatching(
            /user pages are reached with session "signed-in"; "guest" will be routed elsewhere/,
          ),
          expect.stringMatching(
            /"mobile" is a high-fidelity reference for a 200 px viewport at scale 2; capture it the same way \(now 390 px at 1\)/,
          ),
        ]),
      );
    });

    it('warns when regions with bounds cannot be measured (unless omitted on purpose)', () => {
      expect(
        check({ 'screens.0.regions.2.locator': undefined }).warnings,
      ).toEqual([
        expect.stringMatching(/"list" have bounds in "desktop" but no locator/),
      ]);
      expect(
        check({
          'screens.0.regions.2.locator': undefined,
          'screens.0.regions.2.component': { use: 'omitted', reason: 'note' },
          'deviations.0.region': 'list',
        }).warnings,
      ).toEqual([]);
    });
  });

  describe('readiness', () => {
    it('accepts an incomplete plan while exploring, and lists what is open', () => {
      const project = createProject();
      cleanups.push(project.cleanup);
      project.write('design/draft/references/a.png', DESKTOP);
      project.writePlan('draft', {
        schemaVersion: 1,
        task: 'draft',
        title: 'Draft',
        request: { summary: 'TODO: what was asked' },
        references: [
          withChanges(plan.references[0], {
            id: 'a',
            file: 'references/a.png',
            kind: null,
            role: null,
            screen: undefined,
          }),
        ],
      });
      const result = checkTask(project.root, 'draft', {
        catalog: fakeCatalog,
      });
      expect(result).toMatchObject({ ok: true, ready: false });
      expect(result.diagnostics.map((d) => d.message)).toEqual([
        'Summarize what was requested.',
        'Reference "a": record its fidelity (sketch, wireframe, high-fidelity or screenshot).',
        'Reference "a": assign its role (screen, responsive-variant, state or detail) after looking at it.',
        'No screens yet: describe what the references show.',
        'No acceptance criteria yet.',
      ]);
    });

    it('keeps unmapped regions, blocking questions and uncaptured screens open', () => {
      const { result, open, errors } = check({
        'screens.0.regions.2.component': null,
        'questions.1': {
          id: 'q-auth',
          text: 'Who may delete?',
          blocking: true,
          status: 'open',
        },
        'questions.2': {
          id: 'q-x',
          text: 'x',
          blocking: false,
          status: 'answered',
        },
        captures: [],
      });
      expect(errors).toEqual(['An answered question records the answer.']);
      expect(open).toEqual([
        'Region "list" (Notes list) is not mapped to components yet.',
        'Blocking question "q-auth" is unanswered: Who may delete?',
        'Screen "notes" has no capture scenario yet.',
      ]);
      expect(result.ready).toBe(false);
    });

    it('points out more than two correction rounds', () => {
      const round = (/** @type {number} */ n) => ({
        id: `round-${n}`,
        focus: 'details',
        before: `run-${n}`,
      });
      expect(
        check({ 'review.rounds': [round(1), round(2), round(3)] }).warnings,
      ).toEqual([
        expect.stringMatching(
          /3 correction rounds: the workflow plans two focused rounds/,
        ),
      ]);
    });
  });
});

describe('moduleBindings', () => {
  it('lists imports and top-level declarations of a route file', () => {
    const names = moduleBindings(
      [
        "import Default, { A, B as C } from './x';",
        "import * as NS from 'y';",
        "import type { T } from 'z';",
        'const D = 1;',
        'export function E() {}',
        'type F = string;',
      ].join('\n'),
    );
    expect([...names.keys()].sort()).toEqual([
      'A',
      'C',
      'D',
      'Default',
      'E',
      'F',
      'NS',
      'T',
    ]);
  });
});

describe('lineOf', () => {
  it('finds keys and array items by path', () => {
    const text = JSON.stringify(
      { a: [{ b: 1 }, { b: 2, c: { d: 3 } }] },
      null,
      2,
    );
    const lines = text.split('\n');
    expect(lines[lineOf(text, ['a', 1, 'c', 'd']) - 1]).toContain('"d": 3');
    expect(lines[lineOf(text, ['a', 1]) - 1]).toContain('{');
    expect(lineOf(text, ['missing'])).toBe(1);
  });
});
