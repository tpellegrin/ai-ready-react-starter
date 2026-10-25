// @ts-check
/**
 * The composition plan (`design/<task>/plan.json`): a small, versioned task
 * artifact that records how an agent read a set of reference images and how
 * it will build them from the project's public components. It is data only:
 * no field is ever executed, unknown keys are refused, and every string is
 * text to show (escaped) or a value to compare.
 *
 * What each item rests on is explicit (`basis`):
 * - `observed`: visible in a reference (cite it in `references`);
 * - `requirement`: stated by the requester (cite it in `requirements`);
 * - `inferred`: the agent's interpretation (say why in `notes`, or record an
 *   assumption);
 * - `default`: the project's established default (e.g. the four states of a
 *   data region in docs/ui/foundation.md).
 *
 * The schema allows an incomplete plan while exploring (roles not yet
 * assigned, regions not yet mapped); `pnpm design check --ready` reports
 * what is still open. Structural validity is not readiness, and neither is
 * visual approval (`review.human`, which tools never set).
 */
import path from 'node:path';

import ts from 'typescript';
import { z } from 'zod';

export const SCHEMA_VERSION = 1;

/** Folder of design tasks and of their evidence, relative to the project. */
export const DESIGN_DIR = 'design';
const EVIDENCE_DIR = 'reports/design';
export const PLAN_FILE = 'plan.json';
export const REFERENCES_DIR = 'references';
const BASELINES_DIR = 'baselines';

export const KEBAB = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const PASCAL = /^[A-Z][A-Za-z0-9]*$/;

const id = z
  .string()
  .regex(KEBAB, 'use a kebab-case id (lowercase letters, digits, dashes)');
const text = z.string().trim().min(1, 'must not be empty');
const ids = z.array(id).default([]);
const basis = z.enum(['observed', 'requirement', 'inferred', 'default']);
const pixels = z.number().int().positive();
const decision = z.enum(['open', 'accepted', 'rejected']);

/** Where a fact came from, and what it cites. */
const evidence = {
  basis,
  references: ids,
  requirements: ids,
  notes: z.string().optional(),
};

/** A public export: the import path `pnpm catalog` prints and the name. */
const publicExport = z.strictObject({
  import: text,
  export: text,
});

/**
 * How a test finds an element: exactly one of role (+ name, level), label,
 * text or testId — the same queries as Playwright and Testing Library.
 */
const locatorShape = {
  role: z
    .string()
    .regex(/^[a-z]+$/, 'an ARIA role such as "heading"')
    .optional(),
  name: text.optional(),
  level: z.number().int().min(1).max(6).optional(),
  label: text.optional(),
  text: text.optional(),
  testId: text.optional(),
  exact: z.boolean().optional(),
};
/** @param {{ role?: string | undefined, label?: string | undefined, text?: string | undefined, testId?: string | undefined }} locator */
const oneQuery = (locator) =>
  [locator.role, locator.label, locator.text, locator.testId].filter(
    (value) => value !== undefined,
  ).length === 1;
/** @param {{ role?: string | undefined, name?: string | undefined, level?: number | undefined }} locator */
const nameWithRole = (locator) =>
  locator.role !== undefined ||
  (locator.name === undefined && locator.level === undefined);
const ONE_QUERY = 'use exactly one of role, label, text or testId';
const NAME_WITH_ROLE = 'name and level only go with role';

const locatorSchema = z
  .strictObject(locatorShape)
  .refine(oneQuery, ONE_QUERY)
  .refine(nameWithRole, NAME_WITH_ROLE);

const referenceSchema = z.strictObject({
  id,
  /** Relative to the task folder, inside references/. */
  file: text,
  sha256: z.string().regex(/^[a-f0-9]{64}$/, 'a sha256 hex digest'),
  /** Facts read from the file by `pnpm design init`. */
  image: z.strictObject({
    format: z.enum(['png', 'jpeg']),
    width: pixels,
    height: pixels,
  }),
  /** Fidelity: what can be compared (see the recipe). */
  kind: z
    .enum(['sketch', 'wireframe', 'high-fidelity', 'screenshot'])
    .nullable(),
  /** What this image is, assigned explicitly (never from file names). */
  role: z.enum(['screen', 'responsive-variant', 'state', 'detail']).nullable(),
  screen: id.optional(),
  state: id.optional(),
  variantOf: id.optional(),
  detailOf: id.optional(),
  region: id.optional(),
  /**
   * The CSS viewport the image represents. Image pixels are not CSS pixels:
   * a 780 px wide phone screenshot at device scale factor 2 is 390 CSS px.
   */
  viewport: z
    .strictObject({
      width: pixels,
      height: pixels,
      deviceScaleFactor: z.number().min(0.5).max(4),
      basis: z.enum(['stated', 'measured', 'assumed']),
    })
    .optional(),
  /** Where it came from (attachment, designer export, licence). */
  source: z.string().optional(),
  notes: z.string().optional(),
});

const mappingSchema = z.discriminatedUnion('use', [
  /** One existing public component. */
  z.strictObject({ use: z.literal('existing'), ...publicExport.shape }),
  /** Existing public components composed (plus local structural wrappers). */
  z.strictObject({
    use: z.literal('composition'),
    parts: z.array(publicExport).min(1),
    wrapper: z.string().optional(),
  }),
  /** A change to an existing component's public API. */
  z.strictObject({
    use: z.literal('extension'),
    ...publicExport.shape,
    change: text,
    justification: text,
    decision,
  }),
  /** A component that does not exist yet. */
  z.strictObject({
    use: z.literal('new'),
    name: z.string().regex(PASCAL, 'a PascalCase component name'),
    scope: z.enum(['feature', 'shared']),
    feature: id.optional(),
    composes: z.array(publicExport).default([]),
    justification: text,
    decision,
  }),
  /** Deliberately not built (say why; usually also a deviation). */
  z.strictObject({ use: z.literal('omitted'), reason: text }),
]);

const regionSchema = z.strictObject({
  id,
  label: text,
  parent: id.optional(),
  ...evidence,
  /** Approximate box per reference, in that image's pixels: [x, y, w, h]. */
  bounds: z
    .record(id, z.tuple([z.number(), z.number(), z.number(), z.number()]))
    .optional(),
  /** States the region appears in (all of the screen's states if omitted). */
  states: z.array(id).optional(),
  component: mappingSchema.nullable(),
  /** How captures find it in the rendered page. */
  locator: locatorSchema.optional(),
});

const stateSchema = z.strictObject({
  id,
  kind: z.enum([
    'content',
    'loading',
    'empty',
    'error',
    'validation',
    'success',
    'other',
  ]),
  ...evidence,
});

const screenSchema = z.strictObject({
  id,
  title: text,
  route: z.strictObject({
    path: z
      .string()
      .regex(
        /^\/(?:[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*)?$/,
        'a route path such as /expenses or /flow/claim/details',
      ),
    group: z.enum(['user', 'guest', 'onboarding']),
    /** `new` until this task scaffolds it, then `existing`. */
    status: z.enum(['new', 'existing']),
  }),
  /** View folder under src/views/<group>/, e.g. "Expenses" or "Claim/Details". */
  view: z
    .string()
    .regex(
      /^[A-Z][A-Za-z0-9]*(?:\/[A-Z][A-Za-z0-9]*)?$/,
      'a PascalCase view folder, e.g. "Expenses" or "ExpenseClaim/Details"',
    ),
  /** The feature that owns its data and domain components. */
  feature: id.nullable().optional(),
  states: z.array(stateSchema).min(1, 'a screen has at least one state'),
  regions: z.array(regionSchema).default([]),
});

const flowSchema = z.strictObject({
  id,
  group: z.enum(['user', 'guest']),
  /** Screen ids in the order users go through them. */
  steps: z.array(id).min(2, 'a flow has at least two steps'),
  ...evidence,
});

const interactionSchema = z.strictObject({
  id,
  screen: id,
  region: id.optional(),
  trigger: text,
  result: text,
  keyboard: z.string().optional(),
  ...evidence,
});

const responsiveSchema = z.strictObject({
  id,
  screen: id,
  region: id.optional(),
  when: text,
  behavior: text,
  ...evidence,
});

const questionSchema = z.strictObject({
  id,
  text,
  /** Blocks a correct implementation (otherwise apply a default and record it). */
  blocking: z.boolean(),
  status: z.enum(['open', 'answered']),
  answer: z.string().optional(),
});

const assumptionSchema = z.strictObject({
  id,
  text,
  basis: z.enum(['inferred', 'default']),
  about: ids,
});

const deviationSchema = z.strictObject({
  id,
  screen: id,
  region: id.optional(),
  reference: id.optional(),
  /** What the reference shows. */
  observed: text,
  /** What is built instead. */
  implemented: text,
  /** The precedence level that wins over the reference's appearance. */
  reason: z.enum([
    'requirement',
    'architecture',
    'accessibility',
    'design-system',
    'assumption',
  ]),
});

const acceptanceSchema = z.strictObject({
  id,
  text,
  verify: z.enum(['e2e', 'unit', 'story', 'capture', 'review']),
  where: z.string().optional(),
});

const apiResponseSchema = z.strictObject({
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
  /** Path below the API base URL, e.g. /expenses (query strings ignored). */
  path: z.string().regex(/^\/[\w\-./]*$/, 'a path such as /expenses'),
  status: z.number().int().min(100).max(599),
  body: z.unknown().optional(),
  /** Never answer (to capture a loading state). */
  hold: z.boolean().optional(),
});

const stepSchema = z
  .strictObject({
    action: z.enum(['click', 'fill', 'press', 'check', 'select', 'hover']),
    target: locatorSchema.optional(),
    value: z.string().optional(),
    key: z.string().optional(),
  })
  .refine(
    (step) => step.action === 'press' || step.target !== undefined,
    'this action needs a target',
  )
  .refine(
    (step) =>
      !['fill', 'select'].includes(step.action) || step.value !== undefined,
    'fill and select need a value',
  )
  .refine(
    (step) => step.action !== 'press' || step.key !== undefined,
    'press needs a key',
  );

const readySchema = z
  .strictObject({
    ...locatorShape,
    state: z.enum(['visible', 'hidden']).optional(),
  })
  .refine(oneQuery, ONE_QUERY)
  .refine(nameWithRole, NAME_WITH_ROLE);

const runLabel = z
  .string()
  .regex(
    /^[a-z0-9][a-z0-9-]{0,40}$/,
    'a run label: lowercase letters, digits and dashes',
  );

const captureSchema = z.strictObject({
  id,
  screen: id,
  state: id,
  /** The reference this render is compared with (design comparison). */
  compare: id.nullable().optional(),
  /** Route to open, when it differs from the screen's (e.g. a query). */
  path: z
    .string()
    .regex(/^\/[\w\-./?=&%]*$/, 'an in-app path such as /expenses?status=open')
    .optional(),
  viewport: z.strictObject({ width: pixels, height: pixels }),
  deviceScaleFactor: z.number().min(1).max(4).default(1),
  mobile: z.boolean().default(false),
  browser: z.enum(['chromium', 'webkit']).default('chromium'),
  locale: z
    .string()
    .regex(/^[a-z]{2}(?:-[A-Z]{2})?$|^pseudo$/)
    .default('en-US'),
  colorScheme: z.enum(['light', 'dark']).default('light'),
  reducedMotion: z.enum(['reduce', 'no-preference']).default('reduce'),
  /**
   * What the evidence covers, always at the requested viewport (it is never
   * resized): one screenshot ("viewport"), or screenshots at successive
   * scroll positions of the page's scroll container until its end
   * ("scroll"; an end never reached is reported as incomplete).
   */
  extent: z.enum(['viewport', 'scroll']).default('viewport'),
  /** The element "scroll" scrolls (default: the largest one that scrolls). */
  scrollContainer: locatorSchema.optional(),
  /** Removed: it resized the viewport (see the message). */
  fullPage: z
    .never({
      error:
        '"fullPage" was removed: it grew the viewport to the content height, which changes vh units, height media queries and sticky elements. Use "extent": "scroll" for screenshots of the whole content at the requested viewport, or delete it for one viewport screenshot.',
    })
    .optional(),
  session: z.enum(['guest', 'signed-in', 'needs-onboarding']),
  /** Every API call the page makes, answered with fixed data. */
  api: z.array(apiResponseSchema).default([]),
  /** Interactions that bring the page into the captured state. */
  steps: z.array(stepSchema).default([]),
  /** Explicit readiness: these must be visible (or hidden) before capture. */
  ready: z
    .array(readySchema)
    .min(1, 'say what must be on screen before capture'),
  timeoutMs: z.number().int().min(500).max(60_000).default(10_000),
  /** Also compared against a reviewed baseline (`pnpm design regress`). */
  regression: z.boolean().default(false),
});

const findingSchema = z.strictObject({
  id,
  capture: id,
  region: id.optional(),
  /** What differs, seen by comparing the render with the reference. */
  observed: text,
  /** What was changed in response. */
  change: z.string().optional(),
  status: z.enum(['fixed', 'open', 'accepted']),
});

const reviewSchema = z.strictObject({
  /** Focused correction rounds after the first render (two by default). */
  rounds: z
    .array(
      z.strictObject({
        id,
        focus: text,
        /** Capture run the findings were made on. */
        before: runLabel,
        /** Capture run after the changes. */
        after: runLabel.optional(),
        findings: z.array(findingSchema).default([]),
        /** Whether the round's changes were kept (null while undecided). */
        kept: z.boolean().nullable().default(null),
      }),
    )
    .default([]),
  /** The capture run with the best verified result. */
  best: runLabel.nullable().default(null),
  /** Differences left on purpose or unresolved. */
  remaining: z
    .array(
      z.strictObject({
        id,
        capture: id.optional(),
        region: id.optional(),
        text,
      }),
    )
    .default([]),
  /** Recorded by a person. Tools only display it. */
  human: z
    .strictObject({
      status: z.enum(['not-reviewed', 'approved', 'changes-requested']),
      by: z.string().optional(),
      notes: z.string().optional(),
    })
    .default({ status: 'not-reviewed' }),
});

export const planSchema = z.strictObject({
  schemaVersion: z.literal(SCHEMA_VERSION),
  task: id,
  title: text,
  request: z.strictObject({
    summary: text,
    requirements: z.array(z.strictObject({ id, text })).default([]),
    notes: z.string().optional(),
  }),
  references: z.array(referenceSchema).default([]),
  screens: z.array(screenSchema).default([]),
  flows: z.array(flowSchema).default([]),
  interactions: z.array(interactionSchema).default([]),
  responsive: z.array(responsiveSchema).default([]),
  questions: z.array(questionSchema).default([]),
  assumptions: z.array(assumptionSchema).default([]),
  deviations: z.array(deviationSchema).default([]),
  acceptance: z.array(acceptanceSchema).default([]),
  captures: z.array(captureSchema).default([]),
  review: reviewSchema.default({
    rounds: [],
    best: null,
    remaining: [],
    human: { status: 'not-reviewed' },
  }),
});

/**
 * @typedef {z.infer<typeof planSchema>} Plan
 * @typedef {z.infer<typeof locatorSchema>} Locator
 * @typedef {Plan['references'][number]} Reference
 * @typedef {Plan['screens'][number]} Screen
 * @typedef {Screen['regions'][number]} Region
 * @typedef {Plan['captures'][number]} Capture
 * @typedef {NonNullable<Region['component']>} Mapping
 * @typedef {Array<string | number>} JsonPath
 */

/** Paths of a task, relative to the project root. */
export const taskPaths = (/** @type {string} */ task) => {
  const dir = `${DESIGN_DIR}/${task}`;
  return {
    dir,
    plan: `${dir}/${PLAN_FILE}`,
    references: `${dir}/${REFERENCES_DIR}`,
    baselines: `${dir}/${BASELINES_DIR}`,
    evidence: `${EVIDENCE_DIR}/${task}`,
  };
};

/** "screens.0.regions.2.component" style, for messages. */
export const formatPath = (/** @type {JsonPath} */ at) =>
  at.reduce(
    (/** @type {string} */ out, part) =>
      typeof part === 'number'
        ? `${out}[${part}]`
        : out
          ? `${out}.${part}`
          : String(part),
    '',
  );

/**
 * Line of a JSON path in the file's text (1 when it cannot be found), so
 * diagnostics point at the right place.
 * @param {string} text
 * @param {JsonPath} at
 */
export const lineOf = (text, at) => {
  const file = ts.parseJsonText('plan.json', text);
  /** @type {ts.Node | undefined} */
  let node = file.statements[0]?.expression;
  for (const [index, part] of at.entries()) {
    if (!node) break;
    if (typeof part === 'number' && ts.isArrayLiteralExpression(node)) {
      node = node.elements[part];
    } else if (ts.isObjectLiteralExpression(node)) {
      const property = node.properties.find(
        (p) =>
          ts.isPropertyAssignment(p) &&
          ts.isStringLiteral(p.name) &&
          p.name.text === String(part),
      );
      if (!property || !ts.isPropertyAssignment(property)) break;
      // Point at the key of the last part; otherwise descend into its value.
      node = index === at.length - 1 ? property : property.initializer;
    } else break;
  }
  if (!node) return 1;
  return file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1;
};

/**
 * @typedef {{ path: JsonPath, message: string }} SchemaIssue
 * @typedef {{ ok: true, plan: Plan } | { ok: false, issues: SchemaIssue[] }} ParseResult
 */

/**
 * Parses plan text: JSON syntax, then the schema.
 * @param {string} source
 * @returns {ParseResult}
 */
export const parsePlan = (source) => {
  /** @type {unknown} */
  let data;
  try {
    data = JSON.parse(source);
  } catch (error) {
    return {
      ok: false,
      issues: [
        {
          path: [],
          message: `not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
    };
  }
  if (
    data &&
    typeof data === 'object' &&
    'schemaVersion' in data &&
    data.schemaVersion !== SCHEMA_VERSION
  ) {
    return {
      ok: false,
      issues: [
        {
          path: ['schemaVersion'],
          message: `schemaVersion ${JSON.stringify(data.schemaVersion)} is not supported; this tooling reads version ${SCHEMA_VERSION}`,
        },
      ],
    };
  }
  const result = planSchema.safeParse(data);
  if (result.success) return { ok: true, plan: result.data };
  return {
    ok: false,
    issues: result.error.issues.map((issue) => ({
      path: /** @type {JsonPath} */ (
        issue.path.filter((p) => typeof p !== 'symbol')
      ),
      message: issue.message,
    })),
  };
};

/** The skeleton `pnpm design init` writes. */
export const skeletonPlan = (
  /** @type {{ task: string, title: string, references: Reference[] }} */ {
    task,
    title,
    references,
  },
) => ({
  schemaVersion: SCHEMA_VERSION,
  task,
  title,
  request: {
    summary: 'TODO: what was asked, in the requester’s words',
    requirements: [],
  },
  references,
  screens: [],
  flows: [],
  interactions: [],
  responsive: [],
  questions: [],
  assumptions: [],
  deviations: [],
  acceptance: [],
  captures: [],
  review: {
    rounds: [],
    best: null,
    remaining: [],
    human: { status: 'not-reviewed' },
  },
});

/** A file path inside the task folder, normalized, or null when it escapes. */
export const insideTask = (
  /** @type {string} */ taskDir,
  /** @type {string} */ file,
) => {
  if (path.isAbsolute(file) || file.includes('\\')) return null;
  const normalized = path.posix.normalize(file);
  if (normalized.startsWith('../') || normalized === '..') return null;
  return path.posix.join(taskDir, normalized);
};
