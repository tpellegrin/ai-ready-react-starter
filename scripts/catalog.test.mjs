import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
/** @param {string} text @returns {unknown} */
const parseJson = (text) => JSON.parse(text);

/**
 * @typedef {{
 *   name: string, kind: string, importPath: string,
 *   exports: Array<{ name: string, props: Array<{ name: string, type: string, required: boolean }> }>,
 *   stories: Array<{ title: string }>, usedBy: string[], docs: string[],
 * }} Entry
 */
const entriesOf = (/** @type {string} */ text) =>
  /** @type {Entry[]} */ (parseJson(text));

/** @param {string[]} args */
const catalog = (args) =>
  spawnSync(process.execPath, ['scripts/catalog.mjs', ...args], {
    cwd: root,
    encoding: 'utf8',
  });

describe('pnpm catalog', () => {
  it('reports facts from source for a building block', () => {
    const result = catalog(['Button', '--json']);
    expect(result.status).toBe(0);
    const [button] = entriesOf(result.stdout);
    expect(button).toMatchObject({
      name: 'Button',
      kind: 'component',
      importPath: 'components/Button',
    });
    const component = button?.exports.find((e) => e.name === 'Button');
    expect(component?.props).toContainEqual(
      expect.objectContaining({
        name: 'label',
        type: 'string',
        required: true,
      }),
    );
    // Global JSX augmentations (data-allow-*) are not the component's props.
    expect(component?.props.some((p) => p.name.startsWith('data-'))).toBe(
      false,
    );
    expect(button?.stories[0]?.title).toBe('Components/Button');
    expect(button?.usedBy.length).toBeGreaterThan(0);
    expect(button?.docs).toContain('docs/ui/foundation.md');
  }, 30_000);

  it('finds building blocks by prop name', () => {
    const result = catalog(['legend', '--json']);
    const names = entriesOf(result.stdout).map((e) => e.name);
    expect(names).toEqual(['RadioGroup']);
  }, 30_000);

  it('says so (exit 1) when nothing matches', () => {
    const result = catalog(['NoSuchBuildingBlock']);
    expect(result.status).toBe(1);
    expect(result.stdout).toContain('Nothing matches');
  }, 30_000);
});
