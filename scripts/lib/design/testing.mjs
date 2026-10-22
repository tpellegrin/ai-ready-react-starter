// @ts-check
/**
 * Test support for the design tooling tests (*.test.mjs next to this file):
 * real PNG/JPEG bytes, a minimal temporary project, `pnpm catalog`-shaped
 * entries and a complete composition plan. Nothing here touches the
 * checkout.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';

import { sha256 } from './images.mjs';

/** @param {string} type @param {Buffer} data */
const chunk = (type, data) => {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(zlib.crc32(body));
  return Buffer.concat([length, body, crc]);
};

/**
 * A valid RGB PNG of one color.
 * @param {number} width @param {number} height
 * @param {[number, number, number]} [color]
 */
export const makePng = (width, height, [r, g, b] = [250, 250, 250]) => {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = 2; // RGB
  const row = Buffer.alloc(1 + width * 3);
  for (let x = 0; x < width; x += 1) {
    row[1 + x * 3] = r;
    row[2 + x * 3] = g;
    row[3 + x * 3] = b;
  }
  const pixels = Buffer.concat(Array.from({ length: height }, () => row));
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', zlib.deflateSync(pixels)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
};

/** JPEG markers up to the frame header (enough for its size). */
export const makeJpegHeader = (
  /** @type {number} */ width,
  /** @type {number} */ height,
) => {
  const app0 = Buffer.from([
    0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00,
    0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
  ]);
  const sof = Buffer.from([
    0xff,
    0xc0,
    0x00,
    0x11,
    0x08,
    height >> 8,
    height & 0xff,
    width >> 8,
    width & 0xff,
    0x03,
    0x01,
    0x22,
    0x00,
    0x02,
    0x11,
    0x01,
    0x03,
    0x11,
    0x01,
  ]);
  return Buffer.concat([
    Buffer.from([0xff, 0xd8]),
    app0,
    sof,
    Buffer.from([0xff, 0xd9]),
  ]);
};

/** A temporary project with the files the design checks read. */
export const createProject = () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'design-test-'));
  /** @param {string} file @param {string | Buffer} content */
  const write = (file, content) => {
    const target = path.join(root, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  };
  write(
    'src/globals/paths.ts',
    [
      'export const guestPaths = {',
      "  index: '/',",
      "  signIn: '/sign-in',",
      '} as const;',
      'export const userPaths = {',
      "  dashboard: '/',",
      "  archive: '/archive',",
      '} as const;',
      '',
    ].join('\n'),
  );
  write(
    'src/views/user/index.tsx',
    [
      "import { paths } from 'globals/paths';",
      "import type { RouteType } from 'globals/types';",
      "import { Insights } from 'features/insights-legacy';",
      '',
      "import { Dashboard } from './Dashboard';",
      '',
      'export const UserRoutes: RouteType[] = [',
      '  { path: paths.dashboard, Component: Dashboard },',
      '];',
      'void Insights;',
      '',
    ].join('\n'),
  );
  write(
    'src/views/user/Dashboard/index.tsx',
    'export const Dashboard = () => null;\n',
  );
  write(
    'src/views/user/Archive/index.tsx',
    'export const Archive = () => null;\n',
  );
  write('src/views/guest/index.tsx', "import { Welcome } from './Welcome';\n");
  write(
    'src/features/notes/index.ts',
    "export { NotesPanel } from './NotesPanel';\n",
  );
  for (const locale of ['en-US', 'pt-BR', 'pseudo']) {
    write(`src/i18n/locales/${locale}.json`, '{}\n');
  }
  return {
    root,
    write,
    /** @param {string} file */
    read: (file) => fs.readFileSync(path.join(root, file), 'utf8'),
    /** @param {string} file */
    exists: (file) => fs.existsSync(path.join(root, file)),
    /** @param {string} task @param {unknown} plan */
    writePlan: (task, plan) =>
      write(`design/${task}/plan.json`, `${JSON.stringify(plan, null, 2)}\n`),
    /** Every file under the project with its content hash (to prove read-only). */
    snapshot: () => {
      /** @param {string} dir @returns {string[]} */
      const walk = (dir) =>
        fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
          const full = path.join(dir, entry.name);
          return entry.isDirectory()
            ? walk(full)
            : [`${path.relative(root, full)}:${sha256(fs.readFileSync(full))}`];
        });
      return walk(root).sort().join('\n');
    },
    cleanup: () => fs.rmSync(root, { recursive: true, force: true }),
  };
};

/**
 * @param {string} name @param {'component' | 'layout' | 'feature'} kind
 * @param {string} importPath
 * @param {Array<[string, 'component' | 'hook' | 'type' | 'value']>} exports
 * @returns {import('../catalog.mjs').Entry}
 */
const entry = (name, kind, importPath, exports) => ({
  name,
  kind,
  importPath,
  folder: `src/${importPath}`,
  exports: exports.map(([exportName, exportKind]) => ({
    name: exportName,
    kind: exportKind,
    doc: '',
    props: [],
  })),
  stories: [],
  tests: [],
  usedBy: [],
  docs: [],
});

/** What `pnpm catalog` would report for the temporary project. */
export const fakeCatalog = () => [
  entry('Button', 'component', 'components/Button', [
    ['Button', 'component'],
    ['ButtonProps', 'type'],
  ]),
  entry('CardBase', 'component', 'components/CardBase', [
    ['CardBase', 'component'],
  ]),
  entry('Flex', 'component', 'components/Flex', [['Flex', 'component']]),
  entry('Text', 'component', 'components/Text', [['Text', 'component']]),
  entry('Toast', 'component', 'components/Toast', [
    ['Toast', 'component'],
    ['useToast', 'hook'],
  ]),
  entry('UserPageLayout', 'layout', 'views/user/common/UserPageLayout', [
    ['UserPageLayout', 'component'],
  ]),
  entry('notes', 'feature', 'features/notes', [
    ['NotesPanel', 'component'],
    ['Note', 'type'],
  ]),
];

export const DESKTOP = makePng(400, 300);
export const MOBILE = makePng(400, 800, [240, 240, 240]);

/** A complete plan for task "notes-page" (references: see DESKTOP, MOBILE). */
export const completePlan = () => ({
  schemaVersion: 1,
  task: 'notes-page',
  title: 'Notes page',
  request: {
    summary: 'Build the notes page from the attached sketch and phone mock.',
    requirements: [{ id: 'req-create', text: 'People can add a note.' }],
  },
  references: [
    {
      id: 'desktop',
      file: 'references/desktop.png',
      sha256: sha256(DESKTOP),
      image: { format: 'png', width: 400, height: 300 },
      kind: 'sketch',
      role: 'screen',
      screen: 'notes',
      viewport: {
        width: 1200,
        height: 900,
        deviceScaleFactor: 1,
        basis: 'assumed',
      },
    },
    {
      id: 'mobile',
      file: 'references/mobile.png',
      sha256: sha256(MOBILE),
      image: { format: 'png', width: 400, height: 800 },
      kind: 'high-fidelity',
      role: 'responsive-variant',
      screen: 'notes',
      variantOf: 'desktop',
      viewport: {
        width: 200,
        height: 400,
        deviceScaleFactor: 2,
        basis: 'stated',
      },
    },
  ],
  screens: [
    {
      id: 'notes',
      title: 'Notes',
      route: { path: '/notes', group: 'user', status: 'new' },
      view: 'Notes',
      feature: 'notes',
      states: [
        {
          id: 'content',
          kind: 'content',
          basis: 'observed',
          references: ['desktop'],
        },
        { id: 'loading', kind: 'loading', basis: 'default' },
      ],
      regions: [
        {
          id: 'page',
          label: 'Page shell',
          basis: 'observed',
          references: ['desktop'],
          component: {
            use: 'existing',
            import: 'views/user/common/UserPageLayout',
            export: 'UserPageLayout',
          },
          locator: { role: 'main' },
        },
        {
          id: 'actions',
          label: 'Add note button',
          parent: 'page',
          basis: 'observed',
          bounds: { desktop: [300, 20, 80, 30] },
          component: {
            use: 'composition',
            parts: [
              { import: 'components/Flex', export: 'Flex' },
              { import: 'components/Button', export: 'Button' },
            ],
          },
          locator: { role: 'button', name: 'Add note' },
        },
        {
          id: 'list',
          label: 'Notes list',
          parent: 'page',
          basis: 'observed',
          bounds: { desktop: [20, 70, 360, 200] },
          component: {
            use: 'existing',
            import: 'features/notes',
            export: 'NotesPanel',
          },
          locator: { role: 'list', name: 'Notes' },
        },
      ],
    },
  ],
  interactions: [
    {
      id: 'add',
      screen: 'notes',
      region: 'actions',
      trigger: 'Activate "Add note"',
      result: 'A dialog asks for the note',
      basis: 'requirement',
      requirements: ['req-create'],
    },
  ],
  responsive: [
    {
      id: 'stack',
      screen: 'notes',
      when: 'narrow viewports',
      behavior: 'The button moves above the list',
      basis: 'observed',
      references: ['mobile'],
    },
  ],
  questions: [
    {
      id: 'q-sort',
      text: 'Sort order?',
      blocking: false,
      status: 'answered',
      answer: 'Newest first',
    },
  ],
  assumptions: [
    { id: 'a-copy', text: 'Copy is placeholder', basis: 'inferred' },
  ],
  deviations: [
    {
      id: 'd-color',
      screen: 'notes',
      region: 'actions',
      reference: 'mobile',
      observed: 'a blue button',
      implemented: 'the primary Button variant',
      reason: 'design-system',
    },
  ],
  acceptance: [{ id: 'ac-add', text: 'A note can be added', verify: 'e2e' }],
  captures: [
    {
      id: 'desktop-content',
      screen: 'notes',
      state: 'content',
      compare: 'desktop',
      viewport: { width: 1200, height: 900 },
      session: 'signed-in',
      api: [
        { method: 'GET', path: '/notes', status: 200, body: { items: [] } },
      ],
      ready: [{ role: 'heading', level: 1, name: 'Notes' }],
    },
  ],
  review: {
    rounds: [],
    best: null,
    remaining: [],
    human: { status: 'not-reviewed' },
  },
});

/**
 * A copy of `plan` with changes applied. Keys are dotted paths
 * ("screens.0.view"); `undefined` deletes. Tests break plans on purpose, so
 * values are unchecked.
 * @param {unknown} plan
 * @param {Record<string, unknown>} changes
 * @returns {unknown}
 */
export const withChanges = (plan, changes) => {
  const copy = /** @type {unknown} */ (structuredClone(plan));
  for (const [at, value] of Object.entries(changes)) {
    const parts = at.split('.');
    const last = parts.pop() ?? '';
    let node = /** @type {Record<string, unknown>} */ (copy);
    for (const part of parts) {
      node = /** @type {Record<string, unknown>} */ (node[part]);
    }
    if (value === undefined) delete node[last];
    else node[last] = value;
  }
  return copy;
};

/**
 * A temporary project with a plan (the complete one by default) and its
 * references.
 * @param {unknown} [plan]
 */
export const projectWithPlan = (plan = completePlan()) => {
  const project = createProject();
  project.write('design/notes-page/references/desktop.png', DESKTOP);
  project.write('design/notes-page/references/mobile.png', MOBILE);
  project.writePlan('notes-page', plan);
  return project;
};
