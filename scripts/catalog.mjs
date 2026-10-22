#!/usr/bin/env node
// @ts-check
/**
 * Finds existing public building blocks before you create one
 * (`pnpm catalog`). Facts are generated from the source with the TypeScript
 * compiler: nothing here is hand-maintained or inferred from names.
 *
 *   pnpm catalog                 one line per building block
 *   pnpm catalog <query>         matches by name, import path or prop name;
 *                                one match prints its full API and usages
 *   pnpm catalog <query> --json  the same as JSON
 *
 * Building blocks: shared components (src/components), layouts and route
 * transitions (src/containers/Layouts, …/RouteTransitions) — folders whose
 * index file is their public API — and each feature's public API
 * (src/features/<name>/index.ts). For each: import path, exports, props of
 * exported components (name, type, required, JSDoc), the component's own
 * JSDoc, stories (Storybook titles), tests, files that import it, and the
 * curated docs that mention it. Usage guidance is curated in
 * docs/ui/foundation.md; this command only reports facts.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import ts from 'typescript';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rel = (/** @type {string} */ file) => path.relative(root, file);

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { json: { type: 'boolean', default: false } },
});
const query = positionals.join(' ').trim().toLowerCase();

const configFile = ts.readConfigFile(
  path.join(root, 'tsconfig.app.json'),
  (file) => ts.sys.readFile(file),
);
const parsed = ts.parseJsonConfigFileContent(
  configFile.config,
  ts.sys,
  root,
  undefined,
  path.join(root, 'tsconfig.app.json'),
);
// Stories and tests are not in the app project; add them for titles/usages.
const extra = parsed.fileNames.length
  ? listFiles(path.join(root, 'src')).filter((file) =>
      /\.(stories|test)\.tsx?$/.test(file),
    )
  : [];
const program = ts.createProgram({
  rootNames: [...new Set([...parsed.fileNames, ...extra])],
  options: { ...parsed.options, noEmit: true },
});
const checker = program.getTypeChecker();

/** @param {string} dir @returns {string[]} */
function listFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? listFiles(full) : [full];
  });
}

/** Folders with an index file under `dir` (components and nested ones). */
const componentFolders = (/** @type {string} */ dir) =>
  listFiles(path.join(root, dir))
    .filter((file) => /[\\/]index\.tsx?$/.test(file))
    .map((file) => path.dirname(file));

/**
 * @typedef {{ name: string, type: string, required: boolean, doc: string }} Prop
 * @typedef {{ name: string, kind: 'component' | 'hook' | 'type' | 'value', doc: string, props: Prop[] }} Export
 * @typedef {{
 *   name: string, kind: 'component' | 'layout' | 'feature',
 *   importPath: string, folder: string, exports: Export[],
 *   stories: Array<{ file: string, title: string }>, tests: string[],
 *   usedBy: string[], docs: string[],
 * }} Entry
 */

/** @param {ts.Symbol} symbol */
const docOf = (symbol) =>
  ts.displayPartsToString(symbol.getDocumentationComment(checker)).trim();

/** @param {ts.Symbol} symbol @param {ts.Node} at @returns {Export} */
const describeExport = (symbol, at) => {
  const target =
    symbol.flags & ts.SymbolFlags.Alias
      ? checker.getAliasedSymbol(symbol)
      : symbol;
  const name = symbol.getName();
  if (!(target.flags & ts.SymbolFlags.Value)) {
    return { name, kind: 'type', doc: docOf(target), props: [] };
  }
  const type = checker.getTypeOfSymbolAtLocation(target, at);
  const [signature] = type.getCallSignatures();
  const isComponent = /^[A-Z]/.test(name) && !!signature;
  const kind = isComponent
    ? 'component'
    : /^use[A-Z]/.test(name)
      ? 'hook'
      : 'value';
  /** @type {Prop[]} */
  let props = [];
  const [first] = signature?.getParameters() ?? [];
  if (isComponent && first) {
    const propsType = checker.getTypeOfSymbolAtLocation(first, at);
    props = propsType
      .getProperties()
      .filter((prop) => {
        // Own props only: skip React/DOM attribute types and global
        // declaration files (e.g. the data-allow-* JSX augmentation).
        const file = prop.getDeclarations()?.[0]?.getSourceFile().fileName;
        return (
          !!file && !file.includes('node_modules') && !file.endsWith('.d.ts')
        );
      })
      .map((prop) => ({
        name: prop.getName(),
        type: checker.typeToString(checker.getTypeOfSymbolAtLocation(prop, at)),
        required: !(prop.flags & ts.SymbolFlags.Optional),
        doc: docOf(prop),
      }));
  }
  return { name, kind, doc: docOf(target), props };
};

/** The Storybook title of a stories file (its default export's `title`). */
const storyTitle = (/** @type {string} */ file) => {
  const source = program.getSourceFile(file);
  let title = '';
  /** @param {ts.Node} node */
  const visit = (node) => {
    if (
      ts.isPropertyAssignment(node) &&
      node.name.getText(source) === 'title' &&
      ts.isStringLiteralLike(node.initializer)
    ) {
      title ||= node.initializer.text;
    }
    ts.forEachChild(node, visit);
  };
  if (source) visit(source);
  return title;
};

/** Which files import each module (resolved, so aliases and relative paths agree). */
/** @type {Map<string, Set<string>>} */
const importers = new Map();
for (const source of program.getSourceFiles()) {
  if (
    source.fileName.includes('node_modules') ||
    !source.fileName.startsWith(root)
  )
    continue;
  /** @param {ts.Node} node */
  const visit = (node) => {
    const specifier =
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
        ? node.moduleSpecifier
        : null;
    if (specifier) {
      const target = checker.getSymbolAtLocation(specifier)?.declarations?.[0];
      const file = target?.getSourceFile().fileName;
      if (file) {
        const set = importers.get(file) ?? new Set();
        set.add(source.fileName);
        importers.set(file, set);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
}

const curatedDocs = [
  'docs/ui/foundation.md',
  'docs/architecture.md',
  'docs/flows.md',
  'docs/animation-system.md',
];
const docTexts = curatedDocs
  .filter((file) => fs.existsSync(path.join(root, file)))
  .map((file) => [file, fs.readFileSync(path.join(root, file), 'utf8')]);

/** @param {string} folder @param {Entry['kind']} kind @returns {Entry | null} */
const describe = (folder, kind) => {
  const index = ['index.tsx', 'index.ts']
    .map((name) => path.join(folder, name))
    .find((file) => fs.existsSync(file));
  const source = index && program.getSourceFile(index);
  if (!index || !source) return null;
  const moduleSymbol = checker.getSymbolAtLocation(source);
  const exports = moduleSymbol
    ? checker
        .getExportsOfModule(moduleSymbol)
        .map((symbol) => describeExport(symbol, source))
    : [];
  const files = fs.readdirSync(folder).map((file) => path.join(folder, file));
  const name = path.basename(folder);
  const own = (/** @type {string} */ file) =>
    file.startsWith(`${folder}${path.sep}`);
  const usedBy = [...(importers.get(index) ?? [])]
    .filter((file) => !own(file))
    .map(rel)
    .sort();
  return {
    name,
    kind,
    importPath: rel(folder).replace(/^src\//, ''),
    folder: rel(folder),
    exports,
    stories: files
      .filter((file) => file.endsWith('.stories.tsx'))
      .map((file) => ({ file: rel(file), title: storyTitle(file) })),
    tests: listFiles(folder)
      .filter((file) => /\.test\.tsx?$/.test(file))
      .map(rel),
    usedBy,
    docs: docTexts
      .filter(([, text]) => new RegExp(`\\b${name}\\b`).test(text ?? ''))
      .map(([file]) => file ?? ''),
  };
};

/** @type {Entry[]} */
const entries = [
  ...componentFolders('src/components').map((folder) =>
    describe(folder, 'component'),
  ),
  ...['src/containers/Layouts', 'src/containers/RouteTransitions'].flatMap(
    (dir) => componentFolders(dir).map((folder) => describe(folder, 'layout')),
  ),
  ...(fs.existsSync(path.join(root, 'src/features'))
    ? fs
        .readdirSync(path.join(root, 'src/features'), { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) =>
          describe(path.join(root, 'src/features', entry.name), 'feature'),
        )
    : []),
]
  .filter((entry) => entry !== null)
  .sort((a, b) => a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name));

const exact = entries.filter((entry) => entry.name.toLowerCase() === query);
const matches = exact.length
  ? exact
  : query
    ? entries.filter(
        (entry) =>
          entry.name.toLowerCase().includes(query) ||
          entry.importPath.toLowerCase().includes(query) ||
          entry.exports.some(
            (e) =>
              e.name.toLowerCase().includes(query) ||
              e.props.some((p) => p.name.toLowerCase() === query),
          ),
      )
    : entries;

if (values.json) {
  console.log(JSON.stringify(matches, null, 2));
  process.exit(matches.length ? 0 : 1);
}

if (!matches.length) {
  console.log(
    `[catalog] Nothing matches "${query}". It may genuinely be missing: check docs/ui/foundation.md, then \`pnpm gen component\` (docs/recipes/README.md).`,
  );
  process.exit(1);
}

const propText = (/** @type {Prop} */ p) => `${p.name}${p.required ? '' : '?'}`;
if (matches.length > 1 || !query) {
  console.log(
    `[catalog] ${matches.length} public building block(s)${query ? ` matching "${query}"` : ''} — facts from source; guidance: docs/ui/foundation.md`,
  );
  for (const entry of matches) {
    const components = entry.exports.filter((e) => e.kind === 'component');
    const props = components.flatMap((c) => c.props.map(propText));
    console.log(
      `  ${entry.name.padEnd(26)} ${entry.kind.padEnd(9)} '${entry.importPath}'  ${components.length ? `props: ${props.join(', ') || '—'}` : `exports: ${entry.exports.map((e) => e.name).join(', ')}`}  · ${entry.stories.length} stories · used by ${entry.usedBy.length}`,
    );
  }
  if (matches.length > 1)
    console.log('  (pass a more specific query for the full API and usages)');
  process.exit(0);
}

const [entry] = matches;
if (entry) {
  console.log(
    `${entry.name} (${entry.kind}) — import from '${entry.importPath}'`,
  );
  for (const item of entry.exports) {
    console.log(
      `\n  export ${item.kind} ${item.name}${item.doc ? `\n    ${item.doc.replace(/\n/g, '\n    ')}` : ''}`,
    );
    for (const prop of item.props) {
      console.log(
        `    ${propText(prop).padEnd(22)} ${prop.type}${prop.doc ? `  — ${prop.doc.split('\n')[0]}` : ''}`,
      );
    }
  }
  console.log(
    `\n  stories: ${entry.stories.map((s) => `${s.title} (${s.file})`).join(', ') || 'none'}`,
  );
  console.log(`  tests:   ${entry.tests.join(', ') || 'none'}`);
  console.log(
    `  used by: ${entry.usedBy.length ? `${entry.usedBy.slice(0, 10).join(', ')}${entry.usedBy.length > 10 ? `, … (${entry.usedBy.length})` : ''}` : 'nothing yet'}`,
  );
  console.log(
    `  curated guidance mentioning it: ${entry.docs.join(', ') || 'none'}`,
  );
}
