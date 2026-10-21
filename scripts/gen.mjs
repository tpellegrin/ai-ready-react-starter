#!/usr/bin/env node
// @ts-check
/**
 * Scaffolds code that follows the starter's conventions.
 *
 *   pnpm gen feature <name> [--entity <Name>] [--dry-run]
 *
 * `feature` creates src/features/<name>/ from scripts/templates/feature:
 * schema-validated API call, feature-owned query keys, a panel with loading,
 * error, empty and success states (logic.ts + index.tsx), MSW handlers,
 * fixtures and a test. It also adds the feature's copy to every locale and
 * registers its mock handlers in src/mocks/handlers.ts.
 *
 * Safety: names are validated (lowercase kebab-case, no paths), the target
 * must not exist, nothing is overwritten, and every check runs before the
 * first write. --dry-run prints the plan and writes nothing.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
const templateDir = path.join(projectRoot, 'scripts/templates/feature');
const featuresDir = path.join(projectRoot, 'src/features');
const localesDir = path.join(projectRoot, 'src/i18n/locales');
const mockRegistry = path.join(projectRoot, 'src/mocks/handlers.ts');
const IMPORT_MARKER = '// starter:gen mock-imports';
const HANDLER_MARKER = '// starter:gen mock-handlers';
const RESERVED = new Set(['index', 'mocks', 'shared', 'common', 'components']);

const usage = `Usage: pnpm gen feature <name> [--entity <Name>] [--dry-run]

  <name>      lowercase kebab-case folder name, e.g. "notes" or "team-members"
  --entity    PascalCase item type (default: derived from <name>, e.g. Note)
  --dry-run   print what would change without writing anything`;

/** @param {string} message @returns {never} */
const exit = (message) => {
  console.error(`[gen] ${message}`);
  process.exit(1);
};

/** @param {string} value */
const toPascal = (value) =>
  value
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');

/** @param {string} value */
const toCamel = (value) => {
  const pascal = toPascal(value);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
};

/** @param {string} name */
const deriveEntity = (name) => {
  const pascal = toPascal(name);
  return pascal.length > 3 && pascal.endsWith('s') && !pascal.endsWith('ss')
    ? pascal.slice(0, -1)
    : `${pascal}Item`;
};

/** @param {string} dir @returns {string[]} */
const listFiles = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? listFiles(full) : [full];
  });

// --- Arguments --------------------------------------------------------
const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    entity: { type: 'string' },
    'dry-run': { type: 'boolean', default: false },
    help: { type: 'boolean', default: false },
  },
});
if (values.help) {
  console.log(usage);
  process.exit(0);
}
const [kind, name, ...extra] = positionals;
if (kind !== 'feature' || !name || extra.length) exit(`\n${usage}`);
const dryRun = values['dry-run'];

if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(name) || name.length > 40) {
  exit(
    `Invalid feature name "${name}". Use lowercase kebab-case (letters, digits, single dashes), at most 40 characters.`,
  );
}
if (RESERVED.has(name)) exit(`"${name}" is reserved. Choose another name.`);

const entity = values.entity ?? deriveEntity(name);
if (!/^[A-Z][A-Za-z0-9]*$/.test(entity)) {
  exit(`Invalid --entity "${entity}". Use PascalCase, e.g. --entity Note.`);
}

const featureDir = path.resolve(featuresDir, name);
if (path.relative(featuresDir, featureDir) !== name) {
  exit(`Refusing to write outside src/features (${name}).`);
}
if (fs.existsSync(featureDir)) {
  exit(`src/features/${name} already exists. Nothing was changed.`);
}

const featureCamel = toCamel(name);
const entityCamel = entity.charAt(0).toLowerCase() + entity.slice(1);
const featureTitle = name
  .split('-')
  .join(' ')
  .replace(/^./, (first) => first.toUpperCase());
const tokens = {
  __Feature__: toPascal(name),
  __feature__: featureCamel,
  __Entity__: entity,
  __entity__: entityCamel,
  __feature_path__: name,
  __FeatureTitle__: featureTitle,
  __loading_copy__: `Loading ${featureTitle.toLowerCase()}…`,
};
/** @param {string} text */
const fill = (text) =>
  Object.entries(tokens).reduce(
    (result, [token, value]) => result.split(token).join(value),
    text,
  );

// --- Plan (every check happens before the first write) -----------------
const files = listFiles(templateDir)
  .filter((file) => path.basename(file) !== 'messages.json')
  .map((file) => {
    const relative = fill(path.relative(templateDir, file));
    return {
      target: path.join(featureDir, relative),
      content: fill(fs.readFileSync(file, 'utf8')),
    };
  });

/** @param {string} text @returns {unknown} */
const parseJson = (text) => JSON.parse(text);
/** @param {string} file */
const readJson = (file) =>
  /** @type {Record<string, unknown>} */ (
    parseJson(fs.readFileSync(file, 'utf8'))
  );

const messages = parseJson(
  fill(fs.readFileSync(path.join(templateDir, 'messages.json'), 'utf8')),
);
const localeFiles = fs
  .readdirSync(localesDir)
  .filter((file) => file.endsWith('.json') && file !== 'pseudo.json')
  .map((file) => path.join(localesDir, file));
for (const file of localeFiles) {
  const locale = readJson(file);
  if (featureCamel in locale) {
    exit(
      `${path.relative(projectRoot, file)} already has a "${featureCamel}" section. Nothing was changed.`,
    );
  }
}

const registry = fs.readFileSync(mockRegistry, 'utf8');
const handlersName = `${entityCamel}Handlers`;
if (registry.includes(handlersName)) {
  exit(
    `src/mocks/handlers.ts already uses ${handlersName}. Nothing was changed.`,
  );
}
const canRegister =
  registry.includes(IMPORT_MARKER) && registry.includes(HANDLER_MARKER);
const importLine = `import { ${handlersName} } from 'features/${name}/mocks';`;

const rel = (/** @type {string} */ file) => path.relative(projectRoot, file);
console.log(
  `[gen] feature "${name}" (entity ${entity})${dryRun ? ' — dry run' : ''}`,
);
for (const file of files) console.log(`  create  ${rel(file.target)}`);
for (const file of localeFiles) {
  console.log(`  update  ${rel(file)} (+ "${featureCamel}" copy)`);
}
console.log('  update  src/i18n/locales/pseudo.json (regenerated)');
console.log(
  canRegister
    ? `  update  ${rel(mockRegistry)} (register ${handlersName})`
    : `  manual  register ${handlersName} in ${rel(mockRegistry)} (markers not found)`,
);

if (dryRun) {
  console.log('[gen] Dry run: nothing was written.');
  process.exit(0);
}

// --- Write --------------------------------------------------------------
for (const file of files) {
  fs.mkdirSync(path.dirname(file.target), { recursive: true });
  fs.writeFileSync(file.target, file.content, { flag: 'wx' });
}

for (const file of localeFiles) {
  const locale = readJson(file);
  locale[featureCamel] = messages;
  fs.writeFileSync(file, `${JSON.stringify(locale, null, 2)}\n`);
}

if (canRegister) {
  const updated = registry
    .replace(IMPORT_MARKER, `${importLine}\n${IMPORT_MARKER}`)
    .replace(HANDLER_MARKER, `...${handlersName},\n  ${HANDLER_MARKER}`);
  fs.writeFileSync(mockRegistry, updated);
}

/** @param {string} command @param {string[]} args */
const run = (command, args) => {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    stdio: 'inherit',
  });
  if (result.status !== 0) {
    exit(
      `"${command} ${args.join(' ')}" failed. Files were written; fix and re-run it.`,
    );
  }
};
run(process.execPath, [path.join(projectRoot, 'scripts/i18n-pseudo.mjs')]);
run(path.join(projectRoot, 'node_modules/.bin/prettier'), [
  '--write',
  '--log-level=warn',
  rel(featureDir),
  rel(localesDir),
  rel(mockRegistry),
]);

console.log(`[gen] Created src/features/${name}. Next steps:
  1. Render <${tokens.__Feature__}Panel /> from a view, importing it from 'features/${name}'
     (add a route in src/views/<group>/index.tsx; use \`lazy\` for code splitting).
  2. Translate the "${featureCamel}" copy in the non-English locales.
  3. Replace the sample model/endpoint with the real API contract.
  4. Run pnpm validate.`);
