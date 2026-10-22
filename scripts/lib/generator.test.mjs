import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { copyConflicts, runPlan } from './generator.mjs';

/** @typedef {import('./generator.mjs').Plan} Plan */

const english = {
  errors: { startup: 'The application could not start.' },
  user: { nav: { dashboard: 'Dashboard' } },
};

describe('copyConflicts', () => {
  it('reports a text that would become a group', () => {
    expect(
      copyConflicts(english, {
        errors: { startup: { title: 'Startup', body: 'Step' } },
      }),
    ).toEqual([
      '"errors.startup" is a text; the plan would turn it into a group (errors.startup.title, errors.startup.body)',
    ]);
  });

  it('reports a group that would become a text', () => {
    expect(copyConflicts(english, { user: { nav: 'Navigation' } })).toEqual([
      '"user.nav" is a group (user.nav.dashboard); the plan would replace it with a text',
    ]);
  });

  it('reports a text the plan would replace', () => {
    expect(
      copyConflicts(english, { user: { nav: { dashboard: 'Home' } } }),
    ).toEqual([
      '"user.nav.dashboard" already exists; the plan would replace its text',
    ]);
  });

  it('accepts new keys merged into existing groups, at any depth', () => {
    expect(
      copyConflicts(english, {
        errors: { review: { title: 'Review', body: 'Step' } },
        user: { nav: { reports: 'Reports' }, reports: { title: 'Reports' } },
        reports: { title: 'Reports' },
      }),
    ).toEqual([]);
  });
});

describe('runPlan preflight', () => {
  /** @type {string} */
  let root;
  /** @type {string[]} */
  let errors;

  /** @param {string} file @param {string} content */
  const write = (file, content) => {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), content);
  };
  /** Every file under the root with its content. */
  const snapshot = () =>
    Object.fromEntries(
      /** @type {string[]} */ (
        fs.readdirSync(root, { recursive: true, encoding: 'utf8' })
      )
        .filter((file) => fs.statSync(path.join(root, file)).isFile())
        .sort()
        .map((file) => [file, fs.readFileSync(path.join(root, file), 'utf8')]),
    );
  /** @param {Partial<Plan>} overrides @returns {Plan} */
  const plan = (overrides) => ({
    title: 'user flow "errors"',
    creates: [
      { path: 'src/views/user/Errors/Startup/index.tsx', content: 'step' },
    ],
    edits: [
      {
        path: 'src/globals/paths.ts',
        marker: 'starter:gen flow-paths',
        insert: "errors: { startup: '/flow/errors/startup' },",
        description: 'paths.flow.errors',
      },
    ],
    copy: {},
    next: [],
    ...overrides,
  });
  /** Runs the plan; a refusal (process.exit) becomes an error with its message. */
  const attempt = (/** @type {Plan} */ candidate, dryRun = false) => {
    try {
      runPlan(root, candidate, { dryRun });
      return null;
    } catch {
      return errors.join('\n');
    }
  };

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'generator-test-'));
    errors = [];
    const json = (/** @type {unknown} */ value) =>
      `${JSON.stringify(value, null, 2)}\n`;
    write('src/i18n/locales/en-US.json', json(english));
    write('src/i18n/locales/es-ES.json', json(english));
    // A locale can differ from the source (i18n:check reports it); it is
    // checked too.
    write(
      'src/i18n/locales/pt-BR.json',
      json({ ...english, errors: { ...english.errors, review: 'Revisão' } }),
    );
    write(
      'src/globals/paths.ts',
      'export const flowPaths = {\n  // starter:gen flow-paths\n};\n',
    );
    vi.spyOn(process, 'exit').mockImplementation((code) => {
      throw new Error(`exit ${String(code)}`);
    });
    vi.spyOn(console, 'error').mockImplementation((message) => {
      errors.push(String(message));
    });
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    fs.rmSync(root, { recursive: true, force: true });
  });

  it.each([
    [
      'a text that would become a group',
      { errors: { startup: { title: 'Startup', body: 'Step' } } },
      'src/i18n/locales/en-US.json: "errors.startup" is a text; the plan would turn it into a group',
    ],
    [
      'a group that would become a text',
      { user: { nav: 'Navigation' } },
      'src/i18n/locales/en-US.json: "user.nav" is a group (user.nav.dashboard)',
    ],
    [
      'a replaced text',
      { user: { nav: { dashboard: 'Home' } } },
      'src/i18n/locales/en-US.json: "user.nav.dashboard" already exists',
    ],
    [
      'a conflict in one locale only',
      { errors: { review: { title: 'Review', body: 'Step' } } },
      'src/i18n/locales/pt-BR.json: "errors.review" is a text',
    ],
  ])(
    'rejects %s in dry runs and real runs, writing nothing',
    (_case, copy, message) => {
      const before = snapshot();
      for (const dryRun of [true, false]) {
        errors = [];
        const refusal = attempt(plan({ copy }), dryRun);
        expect(refusal).toContain(message);
        expect(refusal).toContain('Nothing was changed.');
        expect(snapshot()).toEqual(before);
      }
    },
  );

  it('lists the conflicts of every locale in one refusal', () => {
    const refusal = attempt(
      plan({ copy: { errors: { startup: { title: 'Startup' } } } }),
    );
    for (const locale of ['en-US', 'es-ES', 'pt-BR']) {
      expect(refusal).toContain(
        `src/i18n/locales/${locale}.json: "errors.startup" is a text`,
      );
    }
  });

  it('accepts copy that only adds keys to existing groups', () => {
    const before = snapshot();
    const refusal = attempt(
      plan({
        copy: {
          errors: { checkout: { title: 'Checkout' } },
          user: { nav: { reports: 'Reports' } },
        },
      }),
      true,
    );
    expect(refusal).toBeNull();
    expect(snapshot()).toEqual(before);
  });
});
