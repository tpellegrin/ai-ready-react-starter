import fs from 'node:fs';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { MAX_IMAGE_BYTES, inspectImage, readImageInfo } from './images.mjs';
import { initTask } from './init.mjs';
import { createRunDir, resolveInside, writeNewFile } from './output.mjs';
import { parsePlan } from './plan.mjs';
import { DESKTOP, createProject, makeJpegHeader, makePng } from './testing.mjs';

/** @type {Array<() => void>} */
const cleanups = [];
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
});
const project = () => {
  const created = createProject();
  cleanups.push(created.cleanup);
  return created;
};

describe('reference image facts', () => {
  it('reads PNG and JPEG sizes from their bytes', () => {
    expect(readImageInfo(makePng(321, 123))).toEqual({
      format: 'png',
      width: 321,
      height: 123,
    });
    expect(readImageInfo(makeJpegHeader(1170, 2532))).toEqual({
      format: 'jpeg',
      width: 1170,
      height: 2532,
    });
    expect(
      readImageInfo(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>')),
    ).toBeNull();
    expect(readImageInfo(Buffer.from([0xff, 0xd8, 0x00, 0x00]))).toBeNull();
  });

  it('refuses files that are too large to be references', () => {
    const { root } = project();
    const file = path.join(root, 'huge.png');
    fs.writeFileSync(file, makePng(1, 1));
    fs.truncateSync(file, MAX_IMAGE_BYTES + 1);
    expect(() => inspectImage(file)).toThrow(/larger than the 20 MB limit/);
  });
});

describe('output safety', () => {
  it('writes only inside the allowed folder, without "..", absolute paths or symlink escapes', () => {
    const { root } = project();
    expect(() => resolveInside(root, 'reports/design', '../x')).toThrow(
      /without "\.\."/,
    );
    expect(() => resolveInside(root, 'reports/design', '/tmp/x')).toThrow(
      /only relative paths/,
    );
    expect(() => resolveInside(root, 'reports/design', 'src/x')).toThrow(
      /outside reports\/design\//,
    );
    expect(() => resolveInside(root, 'design', 'design-x/plan.json')).toThrow(
      /outside design\//,
    );

    fs.symlinkSync(path.join(root, 'src'), path.join(root, 'reports'));
    expect(() =>
      resolveInside(root, 'reports/design', 'reports/design/t/run-1'),
    ).toThrow(/through a symlink, outside reports\/design\//);
  });

  it('never reuses an evidence run folder', () => {
    const { root } = project();
    expect(createRunDir(root, 'notes-page', undefined).relative).toBe(
      'reports/design/notes-page/run-1',
    );
    expect(createRunDir(root, 'notes-page', undefined).relative).toBe(
      'reports/design/notes-page/run-2',
    );
    expect(createRunDir(root, 'notes-page', 'round-1').label).toBe('round-1');
    expect(() => createRunDir(root, 'notes-page', 'round-1')).toThrow(
      /already exists: evidence runs are never overwritten/,
    );
  });

  it('never replaces a file', () => {
    const { root, read } = project();
    writeNewFile(root, 'design', 'design/t/plan.json', 'first');
    expect(() =>
      writeNewFile(root, 'design', 'design/t/plan.json', 'second'),
    ).toThrow(/already exists; it was left as it is/);
    expect(read('design/t/plan.json')).toBe('first');
  });
});

describe('pnpm design init', () => {
  it('copies references and writes a skeleton with their facts, interpreting nothing', async () => {
    const { root, read, write } = project();
    write('inbox/Home Screen (1).PNG', DESKTOP);
    write('inbox/phone.jpeg', makeJpegHeader(1170, 2532));
    const result = await initTask({
      root,
      task: 'notes-page',
      images: [
        path.join(root, 'inbox/Home Screen (1).PNG'),
        path.join(root, 'inbox/phone.jpeg'),
      ],
      title: 'Notes',
    });
    expect(result).toMatchObject({
      ok: true,
      copied: [
        'design/notes-page/references/home-screen-1.png',
        'design/notes-page/references/phone.jpg',
      ],
      created: 'design/notes-page/plan.json',
    });
    const parsed = parsePlan(read('design/notes-page/plan.json'));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.plan.references).toEqual([
      expect.objectContaining({
        id: 'home-screen-1',
        file: 'references/home-screen-1.png',
        image: { format: 'png', width: 400, height: 300 },
        role: null,
        kind: null,
      }),
      expect.objectContaining({
        id: 'phone',
        image: { format: 'jpeg', width: 1170, height: 2532 },
      }),
    ]);
    expect(parsed.plan.screens).toEqual([]);
    expect(parsed.plan.review.human.status).toBe('not-reviewed');
  });

  it('registers images saved in references/ by hand', async () => {
    const { root, write, read } = project();
    write('design/sketches/references/board.png', DESKTOP);
    const result = await initTask({ root, task: 'sketches', images: [] });
    expect(result.ok).toBe(true);
    expect(read('design/sketches/plan.json')).toContain(
      '"file": "references/board.png"',
    );
  });

  it('validates everything before writing anything', async () => {
    const { root, write, exists } = project();
    write('inbox/a.png', DESKTOP);
    write('inbox/notes.txt', 'not an image');
    const result = await initTask({
      root,
      task: 'notes-page',
      images: [
        path.join(root, 'inbox/a.png'),
        path.join(root, 'inbox/notes.txt'),
        path.join(root, 'inbox/missing.png'),
      ],
    });
    expect(result.ok).toBe(false);
    expect(result.problems).toEqual([
      expect.stringMatching(/notes\.txt: not a PNG or JPEG image/),
      expect.stringMatching(/missing\.png: not found/),
    ]);
    expect(exists('design/notes-page')).toBe(false);
  });

  it('says there is nothing to work from without images', async () => {
    const { root } = project();
    const result = await initTask({ root, task: 'empty', images: [] });
    expect(result.problems).toEqual([
      expect.stringMatching(
        /No reference images\. .*images attached to a chat are not files the tools can read/,
      ),
    ]);
  });

  it('never overwrites: an existing plan stays as it is and new references are only proposed', async () => {
    const { root, write, read } = project();
    write('inbox/a.png', DESKTOP);
    write('inbox/b.png', makePng(20, 20));
    await initTask({
      root,
      task: 'notes-page',
      images: [path.join(root, 'inbox/a.png')],
    });
    const plan = read('design/notes-page/plan.json');

    const again = await initTask({
      root,
      task: 'notes-page',
      images: [path.join(root, 'inbox/a.png')],
    });
    expect(again.problems).toEqual([
      expect.stringMatching(
        /references\/a\.png already exists; it was left as it is/,
      ),
    ]);

    const added = await initTask({
      root,
      task: 'notes-page',
      images: [path.join(root, 'inbox/b.png')],
    });
    expect(added).toMatchObject({
      ok: true,
      created: null,
      copied: ['design/notes-page/references/b.png'],
      pending: [
        expect.objectContaining({
          id: 'b',
          image: { format: 'png', width: 20, height: 20 },
        }),
      ],
    });
    expect(read('design/notes-page/plan.json')).toBe(plan);
  });

  it('refuses task names that are not plain folder names', async () => {
    const { root } = project();
    for (const task of ['../src', 'Notes', 'a/b', '']) {
      const result = await initTask({ root, task, images: [] });
      expect(result.ok, task).toBe(false);
    }
  });
});
