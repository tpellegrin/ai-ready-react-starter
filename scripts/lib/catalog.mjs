// @ts-check
/**
 * Facts about the public building blocks, read from the source with the
 * TypeScript compiler (nothing hand-maintained or inferred from names).
 * `pnpm catalog` prints them; `pnpm design check` resolves a composition
 * plan's component mappings against them.
 *
 * Building blocks: shared components (src/components), layouts and route
 * transitions (src/containers/Layouts, …/RouteTransitions), the page shells
 * of each view group (src/views/<group>/common) — folders whose index file
 * is their public API — and each feature's public API
 * (src/features/<name>/index.ts). For each: import path, exports, props of
 * exported components (name, type, required, JSDoc), the component's own
 * JSDoc, stories (Storybook titles), tests, files that import it, and the
 * curated docs that mention it.
 */
import fs from 'node:fs';
import path from 'node:path';

import ts from 'typescript';

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

const CURATED_DOCS = [
  'docs/ui/foundation.md',
  'docs/architecture.md',
  'docs/flows.md',
  'docs/animation-system.md',
];

/** @param {string} dir @returns {string[]} */
const listFiles = (dir) =>
  fs.existsSync(dir)
    ? fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const full = path.join(dir, entry.name);
        return entry.isDirectory() ? listFiles(full) : [full];
      })
    : [];

/**
 * Every public building block of the project at `root`, sorted by kind and
 * name.
 * @param {string} root
 * @returns {Entry[]}
 */
export const loadCatalog = (root) => {
  const rel = (/** @type {string} */ file) => path.relative(root, file);
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

  /** Folders with an index file under `dir` (components and nested ones). */
  const componentFolders = (/** @type {string} */ dir) =>
    listFiles(path.join(root, dir))
      .filter((file) => /[\\/]index\.tsx?$/.test(file))
      .map((file) => path.dirname(file));

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
          type: checker.typeToString(
            checker.getTypeOfSymbolAtLocation(prop, at),
          ),
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
        const target =
          checker.getSymbolAtLocation(specifier)?.declarations?.[0];
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

  const docTexts = CURATED_DOCS.filter((file) =>
    fs.existsSync(path.join(root, file)),
  ).map((file) => [file, fs.readFileSync(path.join(root, file), 'utf8')]);

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
      importPath: rel(folder)
        .split(path.sep)
        .join('/')
        .replace(/^src\//, ''),
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

  const subfolders = (/** @type {string} */ dir) =>
    fs.existsSync(path.join(root, dir))
      ? fs
          .readdirSync(path.join(root, dir), { withFileTypes: true })
          .filter((entry) => entry.isDirectory())
          .map((entry) => path.join(root, dir, entry.name))
      : [];

  return [
    ...componentFolders('src/components').map((folder) =>
      describe(folder, 'component'),
    ),
    ...[
      'src/containers/Layouts',
      'src/containers/RouteTransitions',
      // Page shells shared by a view group (e.g. UserPageLayout).
      ...subfolders('src/views').map((group) =>
        path.relative(root, path.join(group, 'common')),
      ),
    ].flatMap((dir) =>
      componentFolders(dir).map((folder) => describe(folder, 'layout')),
    ),
    ...subfolders('src/features').map((folder) => describe(folder, 'feature')),
  ]
    .filter((entry) => entry !== null)
    .sort(
      (a, b) => a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name),
    );
};
