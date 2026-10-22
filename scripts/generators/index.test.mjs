import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { flowPlan } from './index.mjs';

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);

describe('flowPlan', () => {
  /** @type {string[]} */
  let errors;

  beforeEach(() => {
    errors = [];
    vi.spyOn(process, 'exit').mockImplementation((code) => {
      throw new Error(`exit ${String(code)}`);
    });
    vi.spyOn(console, 'error').mockImplementation((message) => {
      errors.push(String(message));
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([
    ['a-1,a1', ['"a-1" → key a1', '"a1" → key a1', 'ReviewCheckA1']],
    // Different keys and components, but one folder on macOS and Windows.
    [
      'a-b1,ab-1',
      [
        'folder src/views/user/ReviewCheck/AB1',
        'folder src/views/user/ReviewCheck/Ab1',
      ],
    ],
  ])(
    'rejects steps that normalize to the same names (%s), before reading the project',
    (steps, expected) => {
      // An empty root: the refusal comes before any file is read.
      const root = fs.mkdtempSync(path.join(os.tmpdir(), 'flow-plan-'));
      try {
        expect(() =>
          flowPlan({
            root,
            name: 'review-check',
            options: { group: 'user', steps },
          }),
        ).toThrow('exit 1');
      } finally {
        fs.rmSync(root, { recursive: true, force: true });
      }
      const message = errors.join('\n');
      for (const part of expected) expect(message).toContain(part);
      expect(message).toContain('Nothing was changed.');
    },
  );

  it('plans similar but distinct steps with their own keys, components and folders', () => {
    const plan = flowPlan({
      root: projectRoot,
      name: 'review-check',
      options: { group: 'user', steps: 'a-1,a-2,b1' },
    });
    expect(plan.creates.map((file) => file.path)).toEqual([
      'src/views/user/ReviewCheck/A1/index.tsx',
      'src/views/user/ReviewCheck/A2/index.tsx',
      'src/views/user/ReviewCheck/B1/index.tsx',
      'src/views/user/ReviewCheck/ReviewCheck.test.tsx',
    ]);
    expect(Object.keys(plan.copy.reviewCheck ?? {})).toEqual([
      'a1',
      'a2',
      'b1',
    ]);
    expect(errors).toEqual([]);
  });
});
