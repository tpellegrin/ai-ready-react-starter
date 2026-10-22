// @ts-check
/**
 * Deterministic checks of a composition plan (`pnpm design check`). Read
 * only: it never writes, never runs anything the plan contains, and only
 * reports facts a script can establish:
 *
 * - the plan parses and matches the schema (scripts/lib/design/plan.mjs);
 * - every reference exists inside the task folder, is the PNG/JPEG the plan
 *   recorded (format, size, sha256: a changed image is stale), and image
 *   pixels agree with the stated CSS viewport and device scale factor;
 * - ids are unique and every cross-reference resolves (screens, states,
 *   regions, references, requirements, flows, captures, review findings);
 * - observed items cite a reference and requirements cite a requirement;
 * - mapped components resolve to real public exports (`pnpm catalog`
 *   facts), never to internals (styles.ts, logic.ts, `_` elements, feature
 *   folders behind their index); proposed components do not take an
 *   existing name;
 * - planned pages do not collide with declared paths, view folders, the
 *   route file's own imports and declarations, or building-block names;
 *   existing pages are really declared;
 * - capture scenarios name valid screens, states, references and locales.
 *
 * Three levels: `error` (the plan is wrong), `warning` (valid but
 * suspicious) and `open` (incomplete: fine while exploring, not ready to
 * implement). Passing says nothing about whether the page matches the
 * references or whether anyone approved it.
 */
import fs from 'node:fs';
import path from 'node:path';

import ts from 'typescript';

import { inspectImage } from './images.mjs';
import {
  DESIGN_DIR,
  KEBAB,
  PLAN_FILE,
  REFERENCES_DIR,
  formatPath,
  insideTask,
  lineOf,
  parsePlan,
  taskPaths,
} from './plan.mjs';

/**
 * @typedef {import('./plan.mjs').Plan} Plan
 * @typedef {import('./plan.mjs').Screen} Screen
 * @typedef {import('./plan.mjs').Reference} Reference
 * @typedef {import('./plan.mjs').Mapping} Mapping
 * @typedef {import('./plan.mjs').JsonPath} JsonPath
 * @typedef {import('../catalog.mjs').Entry} CatalogEntry
 * @typedef {'error' | 'warning' | 'open'} Level
 * @typedef {{ level: Level, file: string, line?: number, path?: string, message: string }} Diagnostic
 * @typedef {{
 *   task: string, file: string, ok: boolean, ready: boolean,
 *   plan: Plan | null, diagnostics: Diagnostic[],
 * }} CheckResult
 */

const IMAGE_EXTENSIONS = /\.(png|jpe?g)$/i;

/** Task folders that have a plan, sorted. */
export const listTasks = (/** @type {string} */ root) => {
  const dir = path.join(root, DESIGN_DIR);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isDirectory() &&
        fs.existsSync(path.join(dir, entry.name, PLAN_FILE)),
    )
    .map((entry) => entry.name)
    .sort();
};

/** Identifiers an ES module binds at top level (imports and declarations). */
export const moduleBindings = (/** @type {string} */ source) => {
  const file = ts.createSourceFile(
    'module.tsx',
    source,
    ts.ScriptTarget.Latest,
    false,
    ts.ScriptKind.TSX,
  );
  /** @type {Map<string, string>} name → where it comes from */
  const names = new Map();
  for (const statement of file.statements) {
    if (ts.isImportDeclaration(statement)) {
      const from = ts.isStringLiteral(statement.moduleSpecifier)
        ? statement.moduleSpecifier.text
        : '?';
      const clause = statement.importClause;
      if (clause?.name) names.set(clause.name.text, `import from '${from}'`);
      const bindings = clause?.namedBindings;
      if (bindings && ts.isNamedImports(bindings)) {
        for (const element of bindings.elements) {
          names.set(element.name.text, `import from '${from}'`);
        }
      } else if (bindings && ts.isNamespaceImport(bindings)) {
        names.set(bindings.name.text, `import * from '${from}'`);
      }
    } else if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name)) {
          names.set(declaration.name.text, 'a declaration in this file');
        }
      }
    } else if (
      (ts.isFunctionDeclaration(statement) ||
        ts.isClassDeclaration(statement) ||
        ts.isTypeAliasDeclaration(statement) ||
        ts.isInterfaceDeclaration(statement) ||
        ts.isEnumDeclaration(statement)) &&
      statement.name
    ) {
      names.set(statement.name.text, 'a declaration in this file');
    }
  }
  return names;
};

/** "account-settings" / "AccountSettings" → "accountSettings" (as `pnpm gen`). */
const camel = (/** @type {string} */ value) =>
  value.charAt(0).toLowerCase() + value.slice(1);

/**
 * Checks one task folder.
 * @param {string} root  project root
 * @param {string} task  folder name under design/
 * @param {{ catalog: () => CatalogEntry[] }} context  loads `pnpm catalog` facts on demand
 * @returns {CheckResult}
 */
export const checkTask = (root, task, { catalog }) => {
  const paths = taskPaths(task);
  const file = paths.plan;
  /** @type {Diagnostic[]} */
  const diagnostics = [];
  const abs = (/** @type {string} */ relative) => path.join(root, relative);
  let source = '';
  /** @param {Level} level @param {JsonPath} at @param {string} message */
  const report = (level, at, message) =>
    diagnostics.push({
      level,
      file,
      line: source ? lineOf(source, at) : 1,
      ...(at.length ? { path: formatPath(at) } : {}),
      message,
    });
  const result = (/** @type {Plan | null} */ plan) => {
    const order = { error: 0, warning: 1, open: 2 };
    diagnostics.sort((a, b) => order[a.level] - order[b.level]);
    const ok = !diagnostics.some((d) => d.level === 'error');
    return {
      task,
      file,
      ok,
      ready: ok && !diagnostics.some((d) => d.level === 'open'),
      plan,
      diagnostics,
    };
  };

  if (!KEBAB.test(task)) {
    report('error', [], `"${task}" is not a kebab-case task name.`);
    return result(null);
  }
  if (!fs.existsSync(abs(file))) {
    report(
      'error',
      [],
      `${file} does not exist. Start the task with \`pnpm design init ${task} <images…>\`.`,
    );
    return result(null);
  }
  source = fs.readFileSync(abs(file), 'utf8');
  const parsed = parsePlan(source);
  if (!parsed.ok) {
    for (const issue of parsed.issues) {
      report('error', issue.path, issue.message);
    }
    return result(null);
  }
  const { plan } = parsed;

  if (plan.task !== task) {
    report(
      'error',
      ['task'],
      `"task" is "${plan.task}" but the folder is design/${task}: they must match.`,
    );
  }
  if (/^TODO\b/.test(plan.request.summary)) {
    report('open', ['request', 'summary'], 'Summarize what was requested.');
  }

  // --- Unique ids --------------------------------------------------------
  /** @param {Array<{ id: string }>} items @param {JsonPath} at @param {string} what */
  const unique = (items, at, what) => {
    /** @type {Set<string>} */
    const seen = new Set();
    items.forEach((item, index) => {
      if (seen.has(item.id)) {
        report(
          'error',
          [...at, index, 'id'],
          `Duplicate ${what} id "${item.id}".`,
        );
      }
      seen.add(item.id);
    });
    return seen;
  };
  const referenceIds = unique(plan.references, ['references'], 'reference');
  const requirementIds = unique(
    plan.request.requirements,
    ['request', 'requirements'],
    'requirement',
  );
  const screenIds = unique(plan.screens, ['screens'], 'screen');
  unique(plan.flows, ['flows'], 'flow');
  unique(plan.interactions, ['interactions'], 'interaction');
  unique(plan.responsive, ['responsive'], 'responsive behavior');
  unique(plan.questions, ['questions'], 'question');
  unique(plan.assumptions, ['assumptions'], 'assumption');
  unique(plan.deviations, ['deviations'], 'deviation');
  unique(plan.acceptance, ['acceptance'], 'acceptance criterion');
  const captureIds = unique(plan.captures, ['captures'], 'capture');
  unique(plan.review.rounds, ['review', 'rounds'], 'review round');
  unique(
    plan.review.remaining,
    ['review', 'remaining'],
    'remaining difference',
  );

  const screenById = new Map(plan.screens.map((s) => [s.id, s]));
  const referenceById = new Map(plan.references.map((r) => [r.id, r]));
  /**
   * The screen a reference depicts (following detail/variant links).
   * @param {string} referenceId
   * @returns {string | undefined}
   */
  const screenOf = (referenceId, depth = 0) => {
    const reference = referenceById.get(referenceId);
    if (!reference || depth > plan.references.length) return undefined;
    if (reference.screen) return reference.screen;
    const parent = reference.detailOf ?? reference.variantOf;
    return parent ? screenOf(parent, depth + 1) : undefined;
  };

  // --- References --------------------------------------------------------
  /** @type {Set<string>} */
  const registeredFiles = new Set();
  /** @type {Map<string, string>} */
  const byHash = new Map();
  plan.references.forEach((reference, index) => {
    const at = ['references', index];
    const target = insideTask(paths.dir, reference.file);
    if (!target || !target.startsWith(`${paths.references}/`)) {
      report(
        'error',
        [...at, 'file'],
        `"${reference.file}" must be a relative path inside ${REFERENCES_DIR}/ of the task folder.`,
      );
    } else if (!IMAGE_EXTENSIONS.test(target)) {
      report(
        'error',
        [...at, 'file'],
        `"${reference.file}" is not a .png, .jpg or .jpeg file.`,
      );
    } else {
      registeredFiles.add(target);
      try {
        const info = inspectImage(abs(target));
        if (
          info.sha256 !== reference.sha256 ||
          info.format !== reference.image.format ||
          info.width !== reference.image.width ||
          info.height !== reference.image.height
        ) {
          report(
            'error',
            [...at, 'sha256'],
            `${target} is not the image this plan was written from (now ${info.format} ${info.width}×${info.height}, sha256 ${info.sha256}). Look at it again, update what the plan says about it, then record these values.`,
          );
        }
        const other = byHash.get(info.sha256);
        if (other) {
          report(
            'warning',
            [...at, 'file'],
            `Same image as reference "${other}".`,
          );
        }
        byHash.set(info.sha256, reference.id);
      } catch (error) {
        report(
          'error',
          [...at, 'file'],
          `${target}: ${error instanceof Error ? error.message : String(error)}. Save the image there (attachments in a chat are not files the tools can read).`,
        );
      }
    }

    if (reference.kind === null) {
      report(
        'open',
        [...at, 'kind'],
        `Reference "${reference.id}": record its fidelity (sketch, wireframe, high-fidelity or screenshot).`,
      );
    }
    if (reference.role === null) {
      report(
        'open',
        [...at, 'role'],
        `Reference "${reference.id}": assign its role (screen, responsive-variant, state or detail) after looking at it.`,
      );
    }
    const needs = (/** @type {keyof Reference} */ key, why = '') => {
      if (reference[key] === undefined) {
        report(
          'error',
          [...at, 'role'],
          `Role "${reference.role}" needs "${key}"${why}.`,
        );
        return false;
      }
      return true;
    };
    if (reference.screen !== undefined && !screenIds.has(reference.screen)) {
      report(
        'error',
        [...at, 'screen'],
        `Screen "${reference.screen}" is not defined in "screens".`,
      );
    }
    for (const key of /** @type {const} */ (['variantOf', 'detailOf'])) {
      const target = reference[key];
      if (target === undefined) continue;
      if (target === reference.id || !referenceIds.has(target)) {
        report(
          'error',
          [...at, key],
          `"${key}" must name another reference ("${target}" is not one).`,
        );
      }
    }
    switch (reference.role) {
      case 'screen':
        needs('screen');
        break;
      case 'state':
        if (needs('screen') && needs('state', ' (the state it shows)')) {
          const screen = screenById.get(reference.screen ?? '');
          if (screen && !screen.states.some((s) => s.id === reference.state)) {
            report(
              'error',
              [...at, 'state'],
              `Screen "${screen.id}" has no state "${reference.state}".`,
            );
          }
        }
        break;
      case 'responsive-variant':
        needs('screen');
        needs('variantOf', ' (the reference it is a variant of)');
        if (!reference.viewport) {
          report(
            'open',
            [...at, 'viewport'],
            `Responsive variant "${reference.id}": record the viewport it represents (width, height, device scale factor and whether that was stated, measured or assumed).`,
          );
        }
        break;
      case 'detail':
        if (
          needs('detailOf', ' (the reference it crops)') &&
          reference.region
        ) {
          const screen = screenById.get(screenOf(reference.id) ?? '');
          if (
            screen &&
            !screen.regions.some((region) => region.id === reference.region)
          ) {
            report(
              'error',
              [...at, 'region'],
              `Screen "${screen.id}" has no region "${reference.region}".`,
            );
          }
        }
        break;
      case null:
        break;
    }
    const viewport = reference.viewport;
    // Pixel-accurate images only: a sketch's pixels say nothing about CSS.
    if (
      viewport &&
      reference.role !== 'detail' &&
      (reference.kind === 'high-fidelity' || reference.kind === 'screenshot')
    ) {
      const cssWidth = reference.image.width / viewport.deviceScaleFactor;
      if (Math.abs(cssWidth - viewport.width) > 2) {
        report(
          'warning',
          [...at, 'viewport'],
          `The image is ${reference.image.width} px wide; at device scale factor ${viewport.deviceScaleFactor} that is ${Math.round(cssWidth)} CSS px, not the ${viewport.width} px viewport recorded. Image pixels are not CSS pixels: check the scale factor.`,
        );
      }
    }
  });
  const referencesDir = abs(paths.references);
  if (fs.existsSync(referencesDir)) {
    for (const name of fs.readdirSync(referencesDir).sort()) {
      const relative = `${paths.references}/${name}`;
      if (IMAGE_EXTENSIONS.test(name) && !registeredFiles.has(relative)) {
        report(
          'warning',
          ['references'],
          `${relative} is not in the plan. Register it with \`pnpm design init ${task}\` (it adds new images) or remove it.`,
        );
      }
    }
  }

  // --- Evidence ------------------------------------------------------------
  /**
   * @param {{ basis: string, references: string[], requirements: string[] }} item
   * @param {JsonPath} at
   * @param {{ bounds?: Record<string, unknown> }} [extra]
   */
  const checkEvidence = (item, at, extra = {}) => {
    item.references.forEach((ref, index) => {
      if (!referenceIds.has(ref)) {
        report(
          'error',
          [...at, 'references', index],
          `Reference "${ref}" is not defined.`,
        );
      }
    });
    item.requirements.forEach((req, index) => {
      if (!requirementIds.has(req)) {
        report(
          'error',
          [...at, 'requirements', index],
          `Requirement "${req}" is not defined in request.requirements.`,
        );
      }
    });
    const cited =
      item.references.length + Object.keys(extra.bounds ?? {}).length;
    if (item.basis === 'observed' && cited === 0) {
      report(
        'error',
        [...at, 'basis'],
        'An observed item cites the reference(s) it is seen in ("references" or "bounds").',
      );
    }
    if (item.basis === 'requirement' && item.requirements.length === 0) {
      report(
        'error',
        [...at, 'basis'],
        'A requirement cites its id in "requirements".',
      );
    }
  };

  // --- Components ------------------------------------------------------------
  /** @type {CatalogEntry[] | null} */
  let entries = null;
  const loadEntries = () => (entries ??= catalog());
  const featureExists = (/** @type {string} */ name) =>
    fs.existsSync(abs(`src/features/${name}/index.ts`));
  const plannedFeatures = new Set(
    plan.screens.flatMap((screen) => (screen.feature ? [screen.feature] : [])),
  );

  /**
   * Resolves an import path + export name to a public export, or reports why
   * it is not one.
   * @param {{ import: string, export: string }} target
   * @param {JsonPath} at
   */
  const resolveExport = (target, at) => {
    const specifier = target.import.replace(/^src\//, '').replace(/\/$/, '');
    const name = target.export;
    const known = loadEntries();
    const owner = known
      .filter(
        (entry) =>
          specifier === entry.importPath ||
          specifier.startsWith(`${entry.importPath}/`),
      )
      .sort((a, b) => b.importPath.length - a.importPath.length)[0];
    const featureMatch = /^features\/([a-z0-9-]+)(\/.*)?$/.exec(specifier);
    if (name.startsWith('_')) {
      report(
        'error',
        [...at, 'export'],
        `${name} is an internal styled element: it stays in its owner's styles.ts. Map the region to the owner's public component (\`pnpm catalog\`).`,
      );
      return;
    }
    if (owner && owner.importPath !== specifier) {
      report(
        'error',
        [...at, 'import'],
        `'${specifier}' is inside ${owner.name}: only its public API '${owner.importPath}' may be used (styles.ts, logic.ts, types and subfolders are private).`,
      );
      return;
    }
    if (!owner && featureMatch) {
      const feature = featureMatch[1] ?? '';
      if (featureMatch[2]) {
        report(
          'error',
          [...at, 'import'],
          `'${specifier}' is inside feature ${feature}: views import features only through 'features/${feature}'.`,
        );
      } else if (!featureExists(feature) && plannedFeatures.has(feature)) {
        report(
          'open',
          [...at, 'import'],
          `${name} from 'features/${feature}' does not exist yet: map it as "use": "new" until \`pnpm gen feature ${feature}\` (or \`pnpm gen component … --feature ${feature}\`) creates it, then as "existing".`,
        );
      } else {
        report(
          'error',
          [...at, 'import'],
          `There is no feature '${specifier}'${plannedFeatures.size ? ` (planned: ${[...plannedFeatures].join(', ')})` : ''}.`,
        );
      }
      return;
    }
    if (!owner) {
      const lower = name.toLowerCase();
      const hints = known
        .filter(
          (entry) =>
            entry.name.toLowerCase() === lower ||
            entry.exports.some((e) => e.name.toLowerCase() === lower),
        )
        .map((entry) => `'${entry.importPath}'`);
      report(
        'error',
        [...at, 'import'],
        `'${specifier}' is not a public building block${hints.length ? `; ${name} is exported by ${hints.join(', ')}` : ''}. List them with \`pnpm catalog\`.`,
      );
      return;
    }
    const found = owner.exports.find((e) => e.name === name);
    if (!found) {
      report(
        'error',
        [...at, 'export'],
        `'${owner.importPath}' does not export ${name}; it exports ${owner.exports.map((e) => e.name).join(', ') || 'nothing'}.`,
      );
    } else if (found.kind === 'type') {
      report(
        'error',
        [...at, 'export'],
        `${name} from '${owner.importPath}' is a type, not something to render.`,
      );
    }
  };

  /** @param {Mapping} mapping @param {JsonPath} at @param {Screen} screen @param {string} regionId */
  const checkMapping = (mapping, at, screen, regionId) => {
    switch (mapping.use) {
      case 'existing':
        resolveExport(mapping, at);
        break;
      case 'composition':
        mapping.parts.forEach((part, index) =>
          resolveExport(part, [...at, 'parts', index]),
        );
        break;
      case 'extension':
        resolveExport(mapping, at);
        if (mapping.decision === 'open') {
          report(
            'open',
            [...at, 'decision'],
            `Decide on the proposed change to ${mapping.export} (${mapping.change}).`,
          );
        }
        break;
      case 'new': {
        mapping.composes.forEach((part, index) =>
          resolveExport(part, [...at, 'composes', index]),
        );
        const taken = loadEntries().find(
          (entry) =>
            entry.kind !== 'feature' &&
            (entry.name === mapping.name ||
              entry.exports.some((e) => e.name === mapping.name)),
        );
        if (taken) {
          report(
            'error',
            [...at, 'name'],
            `${mapping.name} already exists ('${taken.importPath}'). Map the region to it, or propose an extension of it, instead of a second one.`,
          );
        }
        const feature = mapping.feature ?? screen.feature ?? undefined;
        if (mapping.scope === 'feature' && !feature) {
          report(
            'error',
            [...at, 'feature'],
            'A feature-scoped component names its feature ("feature", or the screen\'s).',
          );
        }
        const folder =
          mapping.scope === 'shared'
            ? `src/components/${mapping.name}`
            : `src/features/${feature}/components/${mapping.name}`;
        if (feature !== undefined || mapping.scope === 'shared') {
          if (fs.existsSync(abs(folder))) {
            report(
              'error',
              [...at, 'name'],
              `${folder} already exists. If this task created it, map the region to it now ("use": "existing" with its public import); otherwise choose another name.`,
            );
          }
        }
        if (mapping.decision === 'open') {
          report(
            'open',
            [...at, 'decision'],
            `Decide on the proposed ${mapping.scope} component ${mapping.name} for region "${regionId}".`,
          );
        }
        break;
      }
      case 'omitted':
        if (
          !plan.deviations.some(
            (d) => d.screen === screen.id && d.region === regionId,
          )
        ) {
          report(
            'warning',
            at,
            `Region "${regionId}" is omitted without a deviation recording what the reference shows and why.`,
          );
        }
        break;
    }
  };

  // --- Screens and regions -----------------------------------------------------
  const pathsSource = fs.existsSync(abs('src/globals/paths.ts'))
    ? fs.readFileSync(abs('src/globals/paths.ts'), 'utf8')
    : '';
  /** @type {Map<string, Map<string, string>>} */
  const routeBindings = new Map();
  const bindingsOf = (/** @type {string} */ group) => {
    const cached = routeBindings.get(group);
    if (cached) return cached;
    const routeFile = abs(`src/views/${group}/index.tsx`);
    /** @type {Map<string, string>} */
    const names = fs.existsSync(routeFile)
      ? moduleBindings(fs.readFileSync(routeFile, 'utf8'))
      : new Map();
    routeBindings.set(group, names);
    return names;
  };
  /** @type {Map<string, number>} */
  const routeUse = new Map();

  plan.screens.forEach((screen, screenIndex) => {
    const at = ['screens', screenIndex];
    const stateIds = unique(screen.states, [...at, 'states'], 'state');
    const regionIds = unique(screen.regions, [...at, 'regions'], 'region');
    screen.states.forEach((state, index) =>
      checkEvidence(state, [...at, 'states', index]),
    );

    routeUse.set(screen.route.path, (routeUse.get(screen.route.path) ?? 0) + 1);
    const viewDir = `src/views/${screen.route.group}/${screen.view}`;
    const declared = pathsSource.includes(`'${screen.route.path}'`);
    if (screen.route.status === 'existing') {
      if (!declared) {
        report(
          'error',
          [...at, 'route', 'path'],
          `${screen.route.path} is not declared in src/globals/paths.ts. Use "status": "new" for a page this task adds.`,
        );
      }
      if (!fs.existsSync(abs(viewDir))) {
        report('error', [...at, 'view'], `${viewDir} does not exist.`);
      }
    } else {
      if (declared) {
        report(
          'error',
          [...at, 'route', 'path'],
          `${screen.route.path} is already declared in src/globals/paths.ts. If this task scaffolded it, set "status": "existing"; otherwise choose another path.`,
        );
      }
      if (fs.existsSync(abs(viewDir))) {
        report(
          'error',
          [...at, 'view'],
          `${viewDir} already exists. If this task scaffolded it, set route "status": "existing"; otherwise choose another name.`,
        );
      }
      const name = screen.view.split('/').pop() ?? screen.view;
      const isFlowStep = screen.view.includes('/');
      if (screen.route.group === 'onboarding') {
        report(
          'warning',
          [...at, 'route', 'group'],
          'The generators do not add onboarding steps: edit src/views/onboarding by hand (docs/flows.md).',
        );
      } else if (!isFlowStep) {
        const binding = bindingsOf(screen.route.group).get(name);
        if (binding) {
          report(
            'error',
            [...at, 'view'],
            `src/views/${screen.route.group}/index.tsx already binds ${name} (${binding}); a page named ${name} would collide with it there. Choose another name.`,
          );
        }
        const building = loadEntries().find(
          (entry) =>
            entry.kind !== 'feature' &&
            (entry.name === name || entry.exports.some((e) => e.name === name)),
        );
        if (building) {
          report(
            'error',
            [...at, 'view'],
            `${name} is a public building block ('${building.importPath}') that pages import; a page with the same name would shadow it. Choose another name.`,
          );
        }
        if (new RegExp(`^\\s+${camel(name)}:`, 'm').test(pathsSource)) {
          report(
            'error',
            [...at, 'view'],
            `paths.${camel(name)} already exists in src/globals/paths.ts (\`pnpm gen view ${name}\` would add it). Choose another name.`,
          );
        }
      }
    }
    if (screen.feature && !featureExists(screen.feature)) {
      const featureDir = abs(`src/features/${screen.feature}`);
      if (fs.existsSync(featureDir)) {
        report(
          'error',
          [...at, 'feature'],
          `src/features/${screen.feature} exists but has no index.ts (its public API).`,
        );
      }
    }

    /** @type {Map<string, string | undefined>} */
    const parents = new Map(screen.regions.map((r) => [r.id, r.parent]));
    screen.regions.forEach((region, index) => {
      const regionAt = [...at, 'regions', index];
      checkEvidence(region, regionAt, { bounds: region.bounds ?? {} });
      if (region.parent !== undefined) {
        if (!regionIds.has(region.parent) || region.parent === region.id) {
          report(
            'error',
            [...regionAt, 'parent'],
            `Parent "${region.parent}" is not another region of screen "${screen.id}".`,
          );
        } else {
          /** @type {Set<string>} */
          const seen = new Set([region.id]);
          /** @type {string | undefined} */
          let current = region.parent;
          while (current !== undefined) {
            if (seen.has(current)) {
              report(
                'error',
                [...regionAt, 'parent'],
                `Region "${region.id}" is its own ancestor (a cycle through "${current}").`,
              );
              break;
            }
            seen.add(current);
            current = parents.get(current);
          }
        }
      }
      (region.states ?? []).forEach((state, stateIndex) => {
        if (!stateIds.has(state)) {
          report(
            'error',
            [...regionAt, 'states', stateIndex],
            `Screen "${screen.id}" has no state "${state}".`,
          );
        }
      });
      for (const [referenceId, box] of Object.entries(region.bounds ?? {})) {
        const reference = referenceById.get(referenceId);
        const boundsAt = [...regionAt, 'bounds', referenceId];
        if (!reference) {
          report(
            'error',
            boundsAt,
            `Reference "${referenceId}" is not defined.`,
          );
          continue;
        }
        if (screenOf(referenceId) !== screen.id) {
          report(
            'error',
            boundsAt,
            `Reference "${referenceId}" does not depict screen "${screen.id}".`,
          );
        }
        const [x, y, w, h] = box;
        if (w <= 0 || h <= 0 || x < 0 || y < 0) {
          report(
            'error',
            boundsAt,
            'Bounds are [x, y, width, height] with a positive size.',
          );
        } else if (
          x + w > reference.image.width + 1 ||
          y + h > reference.image.height + 1
        ) {
          report(
            'warning',
            boundsAt,
            `The box extends past the ${reference.image.width}×${reference.image.height} image.`,
          );
        }
      }
      if (region.component === null) {
        report(
          'open',
          [...regionAt, 'component'],
          `Region "${region.id}" (${region.label}) is not mapped to components yet.`,
        );
      } else {
        checkMapping(
          region.component,
          [...regionAt, 'component'],
          screen,
          region.id,
        );
      }
    });
  });
  for (const [route, count] of routeUse) {
    if (count > 1) {
      report(
        'warning',
        ['screens'],
        `${count} screens use ${route}; different states of one page are states of one screen.`,
      );
    }
  }
  if (!plan.screens.length) {
    report(
      'open',
      ['screens'],
      'No screens yet: describe what the references show.',
    );
  }

  /** @param {string} screenId @param {string | undefined} regionId @param {JsonPath} at */
  const checkTarget = (screenId, regionId, at) => {
    const screen = screenById.get(screenId);
    if (!screen) {
      report(
        'error',
        [...at, 'screen'],
        `Screen "${screenId}" is not defined.`,
      );
      return;
    }
    if (
      regionId !== undefined &&
      !screen.regions.some((r) => r.id === regionId)
    ) {
      report(
        'error',
        [...at, 'region'],
        `Screen "${screenId}" has no region "${regionId}".`,
      );
    }
  };

  // --- Flows, interactions, responsive behavior, deviations --------------------
  plan.flows.forEach((flow, index) => {
    const at = ['flows', index];
    checkEvidence(flow, at);
    flow.steps.forEach((step, stepIndex) => {
      const screen = screenById.get(step);
      if (!screen) {
        report(
          'error',
          [...at, 'steps', stepIndex],
          `Screen "${step}" is not defined.`,
        );
        return;
      }
      if (!screen.route.path.startsWith(`/flow/${flow.id}/`)) {
        report(
          'error',
          [...at, 'steps', stepIndex],
          `Step "${step}" is routed at ${screen.route.path}; flow steps live at /flow/${flow.id}/<step> (docs/flows.md).`,
        );
      }
    });
    if (new Set(flow.steps).size !== flow.steps.length) {
      report('error', [...at, 'steps'], 'A flow lists each step once.');
    }
    if (flow.basis === 'inferred' || flow.basis === 'default') {
      report(
        'open',
        [...at, 'basis'],
        `The order of flow "${flow.id}" is inferred: confirm it (file names and attachment order are not evidence of order).`,
      );
    }
  });
  plan.interactions.forEach((item, index) => {
    checkEvidence(item, ['interactions', index]);
    checkTarget(item.screen, item.region, ['interactions', index]);
  });
  plan.responsive.forEach((item, index) => {
    checkEvidence(item, ['responsive', index]);
    checkTarget(item.screen, item.region, ['responsive', index]);
  });
  plan.deviations.forEach((item, index) => {
    checkTarget(item.screen, item.region, ['deviations', index]);
    if (item.reference !== undefined && !referenceIds.has(item.reference)) {
      report(
        'error',
        ['deviations', index, 'reference'],
        `Reference "${item.reference}" is not defined.`,
      );
    }
  });
  plan.questions.forEach((question, index) => {
    if (question.status === 'answered' && !question.answer?.trim()) {
      report(
        'error',
        ['questions', index, 'answer'],
        'An answered question records the answer.',
      );
    }
    if (question.status === 'open' && question.blocking) {
      report(
        'open',
        ['questions', index],
        `Blocking question "${question.id}" is unanswered: ${question.text}`,
      );
    }
  });
  if (!plan.acceptance.length) {
    report('open', ['acceptance'], 'No acceptance criteria yet.');
  }

  // --- Captures ------------------------------------------------------------------
  const localesDir = abs('src/i18n/locales');
  const locales = fs.existsSync(localesDir)
    ? fs
        .readdirSync(localesDir)
        .filter((name) => name.endsWith('.json'))
        .map((name) => name.replace(/\.json$/, ''))
        .sort()
    : [];
  /** @type {Set<string>} */
  const captured = new Set();
  plan.captures.forEach((capture, index) => {
    const at = ['captures', index];
    const screen = screenById.get(capture.screen);
    if (!screen) {
      report(
        'error',
        [...at, 'screen'],
        `Screen "${capture.screen}" is not defined.`,
      );
      return;
    }
    captured.add(screen.id);
    if (!screen.states.some((s) => s.id === capture.state)) {
      report(
        'error',
        [...at, 'state'],
        `Screen "${screen.id}" has no state "${capture.state}".`,
      );
    }
    if (locales.length && !locales.includes(capture.locale)) {
      report(
        'error',
        [...at, 'locale'],
        `Locale "${capture.locale}" is not one of the project's (${locales.join(', ')}).`,
      );
    }
    if (
      capture.path !== undefined &&
      !capture.path.startsWith(screen.route.path)
    ) {
      report(
        'warning',
        [...at, 'path'],
        `${capture.path} does not start with the screen's route ${screen.route.path}.`,
      );
    }
    const expected = screen.route.group === 'guest' ? 'guest' : 'signed-in';
    if (
      screen.route.group !== 'onboarding' &&
      capture.session !== expected &&
      capture.session !== 'needs-onboarding'
    ) {
      report(
        'warning',
        [...at, 'session'],
        `${screen.route.group} pages are reached with session "${expected}"; "${capture.session}" will be routed elsewhere.`,
      );
    }
    const compare = capture.compare;
    if (compare) {
      const reference = referenceById.get(compare);
      if (!reference) {
        report(
          'error',
          [...at, 'compare'],
          `Reference "${compare}" is not defined.`,
        );
      } else {
        if (screenOf(compare) !== screen.id) {
          report(
            'error',
            [...at, 'compare'],
            `Reference "${compare}" does not depict screen "${screen.id}".`,
          );
        }
        if (reference.role === 'state' && reference.state !== capture.state) {
          report(
            'warning',
            [...at, 'compare'],
            `Reference "${compare}" shows state "${reference.state}", the capture renders "${capture.state}".`,
          );
        }
        const viewport = reference.viewport;
        if (
          (reference.kind === 'high-fidelity' ||
            reference.kind === 'screenshot') &&
          viewport &&
          viewport.basis !== 'assumed' &&
          (viewport.width !== capture.viewport.width ||
            viewport.deviceScaleFactor !== capture.deviceScaleFactor)
        ) {
          report(
            'warning',
            [...at, 'viewport'],
            `"${compare}" is a ${reference.kind} reference for a ${viewport.width} px viewport at scale ${viewport.deviceScaleFactor}; capture it the same way (now ${capture.viewport.width} px at ${capture.deviceScaleFactor}) or explain the difference.`,
          );
        }
        const measurable = screen.regions.filter(
          (region) =>
            region.bounds?.[compare] &&
            !region.locator &&
            region.component?.use !== 'omitted',
        );
        if (measurable.length) {
          report(
            'warning',
            [...at, 'compare'],
            `Region(s) ${measurable.map((r) => `"${r.id}"`).join(', ')} have bounds in "${compare}" but no locator, so captures cannot measure them.`,
          );
        }
      }
    }
  });
  for (const screen of plan.screens) {
    if (!captured.has(screen.id)) {
      report(
        'open',
        ['captures'],
        `Screen "${screen.id}" has no capture scenario yet.`,
      );
    }
  }

  // --- Review ----------------------------------------------------------------------
  if (plan.review.rounds.length > 2) {
    report(
      'warning',
      ['review', 'rounds'],
      `${plan.review.rounds.length} correction rounds: the workflow plans two focused rounds; say in the round's focus why more were needed.`,
    );
  }
  plan.review.rounds.forEach((round, roundIndex) => {
    unique(
      round.findings,
      ['review', 'rounds', roundIndex, 'findings'],
      'finding',
    );
    round.findings.forEach((finding, index) => {
      const at = ['review', 'rounds', roundIndex, 'findings', index];
      if (!captureIds.has(finding.capture)) {
        report(
          'error',
          [...at, 'capture'],
          `Capture "${finding.capture}" is not defined.`,
        );
        return;
      }
      const capture = plan.captures.find((c) => c.id === finding.capture);
      if (capture && finding.region !== undefined) {
        checkTarget(capture.screen, finding.region, at);
      }
    });
  });
  plan.review.remaining.forEach((item, index) => {
    if (item.capture !== undefined && !captureIds.has(item.capture)) {
      report(
        'error',
        ['review', 'remaining', index, 'capture'],
        `Capture "${item.capture}" is not defined.`,
      );
    }
  });

  return result(plan);
};
