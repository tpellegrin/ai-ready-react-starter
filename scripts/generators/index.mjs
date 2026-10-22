// @ts-check
/**
 * Plans for `pnpm gen <kind>` (scripts/gen.mjs). Each returns a Plan for
 * scripts/lib/generator.mjs, which validates and applies it. Generated code
 * follows the maintained examples: public components composed from existing
 * building blocks, `_<Owner><Part>` styled elements with theme tokens,
 * logic.ts only when asked for, explicit exports, copy in every locale,
 * tests or stories, routes in the right group (lazy by default for pages).
 */
import fs from 'node:fs';
import path from 'node:path';

import {
  KEBAB,
  PASCAL,
  fail,
  fill,
  fromTemplate,
  toCamel,
  toKebab,
  toPascal,
} from '../lib/generator.mjs';

/** @typedef {import('../lib/generator.mjs').Plan} Plan */
/**
 * @typedef {{
 *   root: string,
 *   name: string,
 *   options: {
 *     entity?: string | undefined,
 *     feature?: string | undefined,
 *     group?: string | undefined,
 *     path?: string | undefined,
 *     steps?: string | undefined,
 *     logic?: boolean | undefined,
 *     nav?: boolean | undefined,
 *     eager?: boolean | undefined,
 *   },
 * }} Context
 */

const RESERVED_FEATURES = new Set([
  'index',
  'mocks',
  'shared',
  'common',
  'components',
]);
const PATHS = 'src/globals/paths.ts';

/** "AccountSettings" / "account-settings" → "Account settings" */
const humanize = (/** @type {string} */ value) => {
  const words = toKebab(value).split('-').join(' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
};

/** @param {Context} context @param {string[]} allowed */
const onlyOptions = ({ options }, allowed) => {
  const extra = Object.entries(options)
    .filter(([, value]) => value !== undefined && value !== false)
    .map(([key]) => key)
    .filter((key) => !allowed.includes(key));
  if (extra.length) {
    fail(`This generator does not take --${extra.join(', --')}.`);
  }
};

/** @param {string} text @returns {unknown} */
const parseJson = (text) => JSON.parse(text);

/** @param {string} root @param {string} file */
const read = (root, file) => fs.readFileSync(path.join(root, file), 'utf8');

/**
 * Shared components (folder with an index) anywhere under src/components.
 * @param {string} root
 * @returns {Map<string, string>} name → folder
 */
const sharedComponents = (root) => {
  /** @type {Map<string, string>} */
  const found = new Map();
  /** @param {string} dir */
  const visit = (dir) => {
    for (const entry of fs.readdirSync(path.join(root, dir), {
      withFileTypes: true,
    })) {
      if (!entry.isDirectory()) continue;
      const child = `${dir}/${entry.name}`;
      if (
        ['index.tsx', 'index.ts'].some((f) =>
          fs.existsSync(path.join(root, child, f)),
        )
      ) {
        found.set(entry.name, child);
      }
      visit(child);
    }
  };
  visit('src/components');
  return found;
};

/** @param {string} root @param {string} feature */
const requireFeature = (root, feature) => {
  if (!KEBAB.test(feature)) fail(`Invalid --feature "${feature}".`);
  if (!fs.existsSync(path.join(root, 'src/features', feature, 'index.ts'))) {
    fail(
      `src/features/${feature} does not exist. Create it first: pnpm gen feature ${feature}`,
    );
  }
};

// --- feature ---------------------------------------------------------------

/** @param {Context} context @returns {Plan} */
export const featurePlan = (context) => {
  onlyOptions(context, ['entity']);
  const { root, name } = context;
  if (!KEBAB.test(name) || name.length > 40) {
    fail(
      `Invalid feature name "${name}". Use lowercase kebab-case (letters, digits, single dashes), at most 40 characters.`,
    );
  }
  if (RESERVED_FEATURES.has(name)) {
    fail(`"${name}" is reserved. Choose another name.`);
  }
  if (fs.existsSync(path.join(root, 'src/features', name))) {
    fail(`src/features/${name} already exists. Nothing was changed.`);
  }
  const pascal = toPascal(name);
  const entity =
    context.options.entity ??
    (pascal.length > 3 && pascal.endsWith('s') && !pascal.endsWith('ss')
      ? pascal.slice(0, -1)
      : `${pascal}Item`);
  if (!/^[A-Z][A-Za-z0-9]*$/.test(entity)) {
    fail(`Invalid --entity "${entity}". Use PascalCase, e.g. --entity Note.`);
  }
  const featureCamel = toCamel(name);
  const entityCamel = entity.charAt(0).toLowerCase() + entity.slice(1);
  const title = humanize(name);
  const tokens = {
    __Feature__: pascal,
    __feature__: featureCamel,
    __Entity__: entity,
    __entity__: entityCamel,
    __feature_path__: name,
    __FeatureTitle__: title,
    __loading_copy__: `Loading ${title.toLowerCase()}…`,
  };
  const templateDir = path.join(root, 'scripts/templates/feature');
  const handlers = `${entityCamel}Handlers`;
  if (read(root, 'src/mocks/handlers.ts').includes(handlers)) {
    fail(
      `src/mocks/handlers.ts already uses ${handlers}. Nothing was changed.`,
    );
  }
  return {
    title: `feature "${name}" (entity ${entity})`,
    creates: fromTemplate(templateDir, `src/features/${name}`, tokens),
    edits: [
      {
        path: 'src/mocks/handlers.ts',
        marker: 'starter:gen mock-imports',
        insert: `import { ${handlers} } from 'features/${name}/mocks';`,
        description: `import ${handlers}`,
        optional: `register ${handlers} from features/${name}/mocks in src/mocks/handlers.ts`,
      },
      {
        path: 'src/mocks/handlers.ts',
        marker: 'starter:gen mock-handlers',
        insert: `...${handlers},`,
        description: `register ${handlers}`,
        optional: `add ...${handlers} to the handlers in src/mocks/handlers.ts`,
      },
    ],
    copy: {
      [featureCamel]: parseJson(
        fill(
          fs.readFileSync(path.join(templateDir, 'messages.json'), 'utf8'),
          tokens,
        ),
      ),
    },
    next: [
      `Replace the sample model, endpoint and fixtures with the real API contract (docs/recipes/new-feature.md).`,
      `Show it on a page: pnpm gen view ${pascal} --group user --path /${name} --feature ${name}`,
      `Translate the "${featureCamel}" copy in the non-English locales.`,
      'Run pnpm validate.',
    ],
  };
};

// --- component ---------------------------------------------------------------

/** @param {Context} context @returns {Plan} */
export const componentPlan = (context) => {
  onlyOptions(context, ['feature', 'logic']);
  const { root, name, options } = context;
  if (!PASCAL.test(name) || name.length > 40) {
    fail(
      `Invalid component name "${name}". Use PascalCase (e.g. StatusBadge), at most 40 characters.`,
    );
  }
  const existing = sharedComponents(root).get(name);
  if (existing) {
    fail(
      `${name} already exists (${existing}). Compose or extend it instead of adding a second one; \`pnpm catalog ${name}\` shows its API and usages.`,
    );
  }
  const feature = options.feature;
  if (feature) requireFeature(root, feature);
  const dir = feature
    ? `src/features/${feature}/components/${name}`
    : `src/components/${name}`;
  if (fs.existsSync(path.join(root, dir))) {
    fail(`${dir} already exists. Nothing was changed.`);
  }
  const logic = options.logic === true;
  const tokens = {
    __Name__: name,
    __scope__: feature ? `feature "${feature}"` : 'shared UI',
    __storyArgs__: logic
      ? "{ label: 'Summary', children: 'Example content' }"
      : "{ children: 'Example content' }",
    __testProps__: logic ? 'label="Summary"' : '',
  };
  const creates = fromTemplate(
    path.join(root, 'scripts/templates/component'),
    dir,
    tokens,
    (file) => {
      if (file === 'index.tsx') return !logic;
      if (file === 'index.with-logic.tsx' || file.startsWith('logic.')) {
        return logic;
      }
      // Shared UI is tested through stories (browser + axe); feature
      // components with a unit test next to them.
      if (file.endsWith('.stories.tsx')) return !feature;
      if (file.endsWith('.test.tsx')) return !!feature;
      return true;
    },
  ).map((file) => ({
    ...file,
    path: file.path.replace(/index\.with-logic\.tsx$/, 'index.tsx'),
  }));

  return {
    title: `component ${name} in ${dir}${logic ? ' (with logic.ts)' : ''}`,
    creates,
    edits: feature
      ? [
          {
            path: `src/features/${feature}/index.ts`,
            marker: 'starter:gen exports',
            insert: `export { ${name} } from './components/${name}';`,
            description: `export ${name} from the feature's public API`,
            optional: `export ${name} from src/features/${feature}/index.ts if views need it (otherwise it stays internal to the feature)`,
          },
        ]
      : [],
    copy: {},
    next: [
      feature
        ? `Use it inside the feature${''} or, if exported, from a view via 'features/${feature}'.`
        : `Import it as 'components/${name}'; its index.tsx is the public API (styles.ts and logic.ts stay private).`,
      'Replace the sample props with the real API; keep copy in t() and styles on theme tokens.',
      feature
        ? 'Run pnpm validate.'
        : 'Run pnpm validate and pnpm test:storybook.',
    ],
  };
};

// --- view (page + route) -------------------------------------------------------

/** @param {Context} context @returns {Plan} */
export const viewPlan = (context) => {
  onlyOptions(context, ['group', 'path', 'feature', 'nav', 'eager']);
  const { root, name, options } = context;
  if (!PASCAL.test(name) || name.length > 40) {
    fail(`Invalid view name "${name}". Use PascalCase, e.g. Reports.`);
  }
  const group = options.group;
  if (group !== 'user' && group !== 'guest') {
    fail(
      '--group must be "user" (signed-in pages) or "guest" (public pages). Multi-step journeys: pnpm gen flow.',
    );
  }
  const routePath = options.path ?? `/${toKebab(name)}`;
  if (
    !/^\/[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*$/.test(
      routePath,
    ) ||
    routePath.startsWith('/flow/')
  ) {
    fail(
      `Invalid --path "${routePath}". Use lowercase segments like /reports or /account/settings (not under /flow/).`,
    );
  }
  if (options.nav && group !== 'user') {
    fail(
      '--nav adds a link to the signed-in navigation; use it with --group user.',
    );
  }
  const key = toCamel(name);
  const pathsSource = read(root, PATHS);
  if (pathsSource.includes(`'${routePath}'`)) {
    fail(`${routePath} is already declared in ${PATHS}. Nothing was changed.`);
  }
  if (new RegExp(`^\\s+${key}:`, 'm').test(pathsSource)) {
    fail(`paths.${key} already exists in ${PATHS}. Choose another name.`);
  }
  const dir = `src/views/${group}/${name}`;
  if (fs.existsSync(path.join(root, dir))) {
    fail(`${dir} already exists. Nothing was changed.`);
  }

  let featureImport = '';
  let featureElement = '';
  if (options.feature) {
    requireFeature(root, options.feature);
    const panel = `${toPascal(options.feature)}Panel`;
    if (
      !read(root, `src/features/${options.feature}/index.ts`).includes(panel)
    ) {
      fail(
        `features/${options.feature} does not export ${panel} (the generated panel). Compose its public components in ${dir}/index.tsx by hand instead of --feature.`,
      );
    }
    featureImport = `import { ${panel} } from 'features/${options.feature}';`;
    featureElement = `<${panel} />`;
  }

  const title = humanize(name);
  const tokens = {
    __Name__: name,
    __key__: key,
    __title__: title,
    __featureImport__: featureImport,
    __featureElement__: featureElement,
  };
  const eager = options.eager === true;
  const routeFile = `src/views/${group}/index.tsx`;
  /** @type {import('../lib/generator.mjs').Edit[]} */
  const edits = [
    {
      path: PATHS,
      marker: `starter:gen ${group}-paths`,
      insert: `${key}: '${routePath}',`,
      description: `paths.${key} = '${routePath}'`,
    },
    ...(eager
      ? [
          {
            path: routeFile,
            marker: 'starter:gen route-imports',
            insert: `import { ${name} } from './${name}';`,
            description: `import ${name}`,
          },
        ]
      : []),
    {
      path: routeFile,
      marker: 'starter:gen routes',
      insert: eager
        ? `{ path: paths.${key}, Component: ${name} },`
        : [
            '{',
            `  path: paths.${key},`,
            `  lazy: () => import('./${name}').then(({ ${name} }) => ({ Component: ${name} })),`,
            '},',
          ].join('\n'),
      description: `${eager ? '' : 'lazy '}route for paths.${key}`,
    },
  ];
  if (options.nav) {
    edits.push({
      path: 'src/views/user/common/UserPageLayout/index.tsx',
      marker: 'starter:gen user-nav',
      insert: [
        '<li>',
        `  <_UserPageLayoutNavLink to={paths.${key}}>`,
        `    {t('user.nav.${key}')}`,
        '  </_UserPageLayoutNavLink>',
        '</li>',
      ].join('\n'),
      description: `navigation link to paths.${key}`,
      optional: `link to paths.${key} from your navigation (user.nav.${key} copy was added)`,
    });
  }

  return {
    title: `${group} page ${name} at ${routePath}${eager ? '' : ' (lazy route)'}`,
    creates: fromTemplate(
      path.join(root, `scripts/templates/view/${group}`),
      dir,
      tokens,
    ),
    edits,
    copy: {
      [group]: {
        [key]: {
          title,
          intro: `What people can do on the ${title.toLowerCase()} page.`,
        },
        ...(options.nav ? { nav: { [key]: title } } : {}),
      },
    },
    next: [
      eager
        ? 'Eager route: fine for light pages; drop --eager to code-split pages with forms or dialogs.'
        : `Lazy route: to keep it out of the initial bundle for good, add '${dir}/index.tsx' to LAZY_MODULES in scripts/check-build.mjs.`,
      'Replace the intro copy and translate it in every locale.',
      'Run pnpm validate.',
    ],
  };
};

// --- flow ---------------------------------------------------------------------

/** @param {Context} context @returns {Plan} */
export const flowPlan = (context) => {
  onlyOptions(context, ['group', 'steps']);
  const { root, name, options } = context;
  if (!KEBAB.test(name) || name.length > 40) {
    fail(
      `Invalid flow id "${name}". Flow ids are kebab-case URL segments (/flow/${name}/<step>), e.g. "account-setup".`,
    );
  }
  const group = options.group;
  if (group !== 'user' && group !== 'guest') {
    fail(
      '--group must be "user" or "guest". The onboarding group holds the required onboarding flow: edit src/views/onboarding instead.',
    );
  }
  const steps = (options.steps ?? '')
    .split(',')
    .map((step) => step.trim())
    .filter(Boolean);
  if (steps.length < 2) {
    fail(
      '--steps needs at least two kebab-case steps, e.g. --steps intro,details,review.',
    );
  }
  const bad = steps.filter((step) => !KEBAB.test(step));
  if (bad.length)
    fail(`Invalid step name(s): ${bad.join(', ')}. Use kebab-case.`);
  if (new Set(steps).size !== steps.length) fail('Step names must be unique.');

  const pathsSource = read(root, PATHS);
  if (pathsSource.includes(`/flow/${name}/`)) {
    fail(`The flow "${name}" already exists in ${PATHS}. Nothing was changed.`);
  }
  const flowPascal = toPascal(name);
  const flowCamel = toCamel(name);
  const dir = `src/views/${group}/${flowPascal}`;
  if (fs.existsSync(path.join(root, dir))) {
    fail(`${dir} already exists. Nothing was changed.`);
  }
  const homeKey = group === 'user' ? 'dashboard' : 'index';
  if (!new RegExp(`^\\s+${homeKey}:`, 'm').test(pathsSource)) {
    fail(
      `paths.${homeKey} (where the flow ends) is missing from ${PATHS}; the generated last step navigates there.`,
    );
  }

  const template = fs.readFileSync(
    path.join(root, 'scripts/templates/flow/step.tsx'),
    'utf8',
  );
  const stepInfo = steps.map((step, index) => ({
    step,
    key: toCamel(step),
    component: `${flowPascal}${toPascal(step)}`,
    title: humanize(step),
    first: index === 0,
    last: index === steps.length - 1,
    position: index + 1,
  }));
  const creates = stepInfo.map((info) => ({
    path: `${dir}/${toPascal(info.step)}/index.tsx`,
    content: fill(template, {
      __Component__: info.component,
      __position__: String(info.position),
      __total__: String(steps.length),
      __flowId__: name,
      __stepKey__: info.key,
      __copyKey__: `${flowCamel}.${info.key}`,
      __navHook__: info.last
        ? 'const { goBack } = useFlowNav();\n  const navigate = useNavigate();'
        : info.first
          ? 'const { goNext } = useFlowNav();'
          : 'const { goNext, goBack } = useFlowNav();',
      __extraImports__: info.last
        ? "import { paths } from 'globals/paths';\nimport { useNavigate } from 'react-router-dom';"
        : '',
      __prevButton__: info.first
        ? ''
        : 'prevButton: { onClick: () => goBack() },',
      __primaryLabel__: info.last
        ? 'flow.common.finish'
        : 'common.actions.continue',
      __primaryAction__: info.last
        ? `() => {\n            navigate(paths.${homeKey});\n          }`
        : '() => goNext()',
    }),
  }));

  const firstKey = stepInfo[0]?.key ?? '';
  const walk = stepInfo
    .flatMap((info, index) => {
      const lines = [
        `    expect(await heading('${info.title}')).toBeInTheDocument();`,
        '    await settleTransitions();',
      ];
      if (index === 1) {
        lines.push(
          "    await user.click(screen.getByRole('button', { name: 'Go back' }));",
          `    expect(await heading('${stepInfo[0]?.title ?? ''}')).toBeInTheDocument();`,
          '    await settleTransitions();',
          "    await user.click(screen.getByRole('button', { name: 'Continue' }));",
          `    expect(await heading('${info.title}')).toBeInTheDocument();`,
          '    await settleTransitions();',
        );
      }
      lines.push(
        info.last
          ? "    expect(screen.getByRole('button', { name: 'Finish' })).toBeEnabled();"
          : "    await user.click(screen.getByRole('button', { name: 'Continue' }));",
      );
      return lines;
    })
    .join('\n');
  creates.push({
    path: `${dir}/${flowPascal}.test.tsx`,
    content: fill(
      fs.readFileSync(
        path.join(root, 'scripts/templates/flow/flow.test.tsx'),
        'utf8',
      ),
      {
        __FlowTitle__: humanize(name),
        __flowId__: name,
        __firstKey__: firstKey,
        __adapterImport__:
          group === 'user'
            ? "import { createFakeAuthAdapter, testUser } from 'test/auth';"
            : '',
        __renderOptions__: `{ ${
          group === 'user'
            ? 'adapter: createFakeAuthAdapter({ user: testUser }), '
            : ''
        }initialPath: paths.flow['${name}'].${firstKey} }`,
        __steps__: walk,
      },
    ),
  });

  const routeFile = `src/views/${group}/index.tsx`;
  return {
    title: `${group} flow "${name}" with ${steps.length} steps (/flow/${name}/…)`,
    creates,
    edits: [
      {
        path: PATHS,
        marker: 'starter:gen flow-paths',
        insert: [
          `'${name}': {`,
          ...stepInfo.map(
            (info) => `  ${info.key}: '/flow/${name}/${info.step}',`,
          ),
          '},',
        ].join('\n'),
        description: `paths.flow['${name}'] (step order = key order)`,
      },
      {
        path: routeFile,
        marker: 'starter:gen route-imports',
        insert: stepInfo
          .map(
            (info) =>
              `import { ${info.component} } from './${flowPascal}/${toPascal(info.step)}';`,
          )
          .join('\n'),
        description: `import the ${steps.length} steps`,
      },
      {
        path: routeFile,
        marker: 'starter:gen routes',
        insert: stepInfo
          .map(
            (info) =>
              `{ path: paths.flow['${name}'].${info.key}, Component: ${info.component} },`,
          )
          .join('\n'),
        description:
          'register the steps (the /flow/ prefix enables the flow shell)',
      },
    ],
    copy: {
      [flowCamel]: Object.fromEntries(
        stepInfo.map((info) => [
          info.key,
          {
            title: info.title,
            body: `What happens in the ${info.title.toLowerCase()} step.`,
          },
        ]),
      ),
    },
    next: [
      `Link to the first step (paths.flow['${name}'].${firstKey}) from a page.`,
      "Replace the last step's finish action with the flow's real completion (a mutation, then navigation).",
      'Replace and translate the step copy; the flow contract check verifies paths and routes.',
      'Run pnpm validate.',
    ],
  };
};
