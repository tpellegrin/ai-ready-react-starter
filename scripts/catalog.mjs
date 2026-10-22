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
 * transitions (src/containers/Layouts, …/RouteTransitions), view-group page
 * shells (src/views/<group>/common) — folders whose index file is their
 * public API — and each feature's public API (src/features/<name>/index.ts).
 * For each: import path, exports, props of exported components (name, type,
 * required, JSDoc), the component's own JSDoc, stories (Storybook titles),
 * tests, files that import it, and the curated docs that mention it
 * (scripts/lib/catalog.mjs, shared with `pnpm design check`). Usage
 * guidance is curated in docs/ui/foundation.md; this command only reports
 * facts.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { loadCatalog } from './lib/catalog.mjs';

/** @typedef {import('./lib/catalog.mjs').Prop} Prop */

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { json: { type: 'boolean', default: false } },
});
const query = positionals.join(' ').trim().toLowerCase();

const entries = loadCatalog(root);

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
