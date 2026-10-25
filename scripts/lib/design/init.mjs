// @ts-check
/**
 * `pnpm design init`: prepares a task folder from local reference images.
 * It records facts (format, pixel size, sha256) and writes a plan skeleton;
 * it does not interpret the images. Everything is validated before the
 * first write (including that no symlink redirects a destination), and
 * nothing is ever overwritten:
 *
 * - new task: copies the images into design/<task>/references/ and writes
 *   design/<task>/plan.json;
 * - existing task: copies new images only and returns their reference
 *   entries for the agent to add (the plan is not touched).
 *
 * Images already saved in references/ but missing from the plan are picked
 * up too, so attachments saved there by hand need no path arguments.
 */
import fs from 'node:fs';
import path from 'node:path';

import * as prettier from 'prettier';

import { inspectImage } from './images.mjs';
import { preflight, resolveInside, writeNewFile } from './output.mjs';
import {
  DESIGN_DIR,
  KEBAB,
  REFERENCES_DIR,
  skeletonPlan,
  taskPaths,
} from './plan.mjs';

/** @typedef {import('./plan.mjs').Reference} Reference */

/** "Home Screen (1).PNG" → "home-screen-1.png" */
const fileNameFor = (/** @type {string} */ file) => {
  const ext = path.extname(file).toLowerCase().replace('.jpeg', '.jpg');
  const stem = path
    .basename(file, path.extname(file))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${stem || 'reference'}${ext}`;
};

/** @param {string} file @returns {unknown} */
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));

/** @param {unknown} error */
const messageOf = (error) =>
  error instanceof Error ? error.message : String(error);

/**
 * @param {{ root: string, task: string, images: string[], title?: string | undefined }} input
 *   images: paths (absolute, or relative to the current directory)
 * @returns {Promise<{
 *   ok: boolean, problems: string[], copied: string[], created: string | null,
 *   pending: Reference[],
 * }>}
 *   pending: entries to add by hand when the plan already existed
 */
export const initTask = async ({ root, task, images, title }) => {
  const fail = (/** @type {string[]} */ problems) => ({
    ok: false,
    problems,
    copied: [],
    created: null,
    pending: [],
  });
  if (!KEBAB.test(task)) {
    return fail([
      `"${task}" is not a kebab-case task name (e.g. expense-overview).`,
    ]);
  }
  const paths = taskPaths(task);
  // The task folder and its parents are checked before anything is read
  // from them or written: no link may redirect them (e.g. design/ → src/).
  try {
    resolveInside(root, DESIGN_DIR, paths.references);
    resolveInside(root, DESIGN_DIR, paths.plan);
  } catch (error) {
    return fail([messageOf(error)]);
  }
  const planFile = path.join(root, paths.plan);
  const planExists = fs.existsSync(planFile);
  const referencesDir = path.join(root, paths.references);
  const existing = fs.existsSync(referencesDir)
    ? fs.readdirSync(referencesDir).filter((n) => /\.(png|jpe?g)$/i.test(n))
    : [];
  /** @type {Set<string>} */
  const registered = new Set();
  if (planExists) {
    try {
      const plan = /** @type {{ references?: Array<{ file?: unknown }> }} */ (
        readJson(planFile)
      );
      for (const ref of plan.references ?? []) {
        if (typeof ref.file === 'string') {
          registered.add(path.posix.basename(ref.file));
        }
      }
    } catch (error) {
      return fail([`${paths.plan}: ${messageOf(error)}`]);
    }
  }

  // Validate everything before the first write.
  /** @type {Array<{ source: string, name: string, copy: boolean }>} */
  const planned = [];
  /** @type {string[]} */
  const problems = [];
  const realReferences = fs.existsSync(referencesDir)
    ? fs.realpathSync(referencesDir)
    : null;
  for (const image of images) {
    const source = path.resolve(image);
    try {
      inspectImage(source);
    } catch (error) {
      problems.push(`${image}: ${messageOf(error)}`);
      continue;
    }
    const alreadyThere =
      realReferences !== null &&
      path.dirname(fs.realpathSync(source)) === realReferences;
    const name = alreadyThere ? path.basename(source) : fileNameFor(source);
    if (!alreadyThere && existing.includes(name)) {
      problems.push(
        `${paths.references}/${name} already exists; it was left as it is. Rename the new image.`,
      );
    } else if (planned.some((p) => p.name === name)) {
      problems.push(`two images would be saved as ${name}; rename one.`);
    } else {
      planned.push({ source, name, copy: !alreadyThere });
    }
  }
  for (const name of existing) {
    if (!registered.has(name) && !planned.some((p) => p.name === name)) {
      const source = path.join(referencesDir, name);
      try {
        inspectImage(source);
        planned.push({ source, name, copy: false });
      } catch (error) {
        problems.push(`${paths.references}/${name}: ${messageOf(error)}`);
      }
    }
  }
  const fresh = planned.filter((p) => !registered.has(p.name));
  if (problems.length) return fail(problems);
  if (!planExists && !fresh.length) {
    return fail([
      `No reference images. Pass PNG/JPEG files, or save them in ${paths.references}/ first (images attached to a chat are not files the tools can read).`,
    ]);
  }

  /** @type {Set<string>} */
  const ids = new Set();
  /** @type {Reference[]} */
  const references = fresh.map((item) => {
    const info = inspectImage(item.source);
    const stem = path.basename(item.name, path.extname(item.name));
    const id = KEBAB.test(stem)
      ? stem
      : `ref-${stem.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}`;
    let unique = id;
    for (let n = 2; ids.has(unique); n += 1) unique = `${id}-${n}`;
    ids.add(unique);
    return {
      id: unique,
      file: `${REFERENCES_DIR}/${item.name}`,
      sha256: info.sha256,
      image: { format: info.format, width: info.width, height: info.height },
      kind: null,
      role: null,
    };
  });

  // Every destination, checked before the first write.
  const destinations = [
    ...fresh.filter((p) => p.copy).map((p) => `${paths.references}/${p.name}`),
    ...(planExists ? [] : [paths.plan]),
  ];
  const blocked = preflight(root, DESIGN_DIR, destinations);
  if (blocked.length) return fail(blocked);

  /** @type {string[]} */
  const copied = [];
  for (const item of fresh.filter((p) => p.copy)) {
    writeNewFile(
      root,
      DESIGN_DIR,
      `${paths.references}/${item.name}`,
      fs.readFileSync(item.source),
    );
    copied.push(`${paths.references}/${item.name}`);
  }
  if (planExists) {
    return {
      ok: true,
      problems: [],
      copied,
      created: null,
      pending: references,
    };
  }
  const text = JSON.stringify(
    skeletonPlan({ task, title: title ?? task, references }),
    null,
    2,
  );
  const formatted = await prettier.format(text, {
    ...(await prettier.resolveConfig(planFile)),
    filepath: planFile,
  });
  writeNewFile(root, DESIGN_DIR, paths.plan, formatted);
  return { ok: true, problems: [], copied, created: paths.plan, pending: [] };
};
