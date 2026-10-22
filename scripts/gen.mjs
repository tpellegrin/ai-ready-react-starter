#!/usr/bin/env node
// @ts-check
/**
 * Scaffolds code that follows the project's conventions (`pnpm gen`).
 *
 *   pnpm gen feature <name> [--entity <Name>]
 *       src/features/<name>: schema-validated endpoint, feature-owned query
 *       keys, a panel with loading/error/empty/success states, MSW handlers
 *       (registered), fixtures, a test and copy.
 *   pnpm gen component <Name> [--feature <name>] [--logic]
 *       A shared component in src/components (story with play + axe) or a
 *       feature component (unit test); logic.ts only with --logic.
 *   pnpm gen view <Name> --group user|guest [--path /x] [--feature <name>] [--nav] [--eager]
 *       A page, its path in src/globals/paths.ts and its route (lazy unless
 *       --eager); --feature renders the generated feature panel; --nav links
 *       it from the signed-in navigation.
 *   pnpm gen flow <id> --group user|guest --steps a,b,c
 *       A multi-step flow: paths.flow entry, one step view per step
 *       (FlowLayout, useFlowNav, progress), routes and a navigation test.
 *
 *   --dry-run prints the plan and writes nothing.
 *
 * Safety: names and paths are validated, existing files are never
 * overwritten, existing translations are never replaced or reshaped (a
 * text never becomes a group, or the reverse), and every edit is checked
 * before the first write (scripts/lib/generator.mjs); --dry-run runs the
 * same checks. Registrations use `starter:gen` markers in the existing
 * registries; when a marker was removed (e.g. a replaced placeholder), the
 * step is reported as manual.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import {
  componentPlan,
  featurePlan,
  flowPlan,
  viewPlan,
} from './generators/index.mjs';
import { fail, runPlan } from './lib/generator.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const usage = `Usage:
  pnpm gen feature <name> [--entity <Name>]
  pnpm gen component <Name> [--feature <name>] [--logic]
  pnpm gen view <Name> --group user|guest [--path /x] [--feature <name>] [--nav] [--eager]
  pnpm gen flow <id> --group user|guest --steps a,b,c
Add --dry-run to print the plan without writing. See docs/recipes/README.md.`;

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    entity: { type: 'string' },
    feature: { type: 'string' },
    group: { type: 'string' },
    path: { type: 'string' },
    steps: { type: 'string' },
    logic: { type: 'boolean' },
    nav: { type: 'boolean' },
    eager: { type: 'boolean' },
    'dry-run': { type: 'boolean', default: false },
    help: { type: 'boolean', default: false },
  },
});
if (values.help) {
  console.log(usage);
  process.exit(0);
}

const planners = {
  feature: featurePlan,
  component: componentPlan,
  view: viewPlan,
  flow: flowPlan,
};
const [kind = '', name, ...extra] = positionals;
if (!(kind in planners) || !name || extra.length) fail(`\n${usage}`);

const { 'dry-run': dryRun, help: _help, ...options } = values;
const plan = planners[/** @type {keyof typeof planners} */ (kind)]({
  root,
  name,
  options,
});
runPlan(root, plan, { dryRun });
