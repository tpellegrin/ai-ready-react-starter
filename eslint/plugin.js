// @ts-check
/**
 * Project rules that core ESLint and the installed plugins cannot express
 * (docs/guardrails.md). Both work on ESLint's AST and comment tokens.
 *
 * - starter/styled-element-names: styled elements in a component's
 *   styles.ts are named `_<Component><Part>` after the owning folder.
 * - starter/no-internal-styled-imports: `_` elements are imported only from
 *   './styles' in their own folder and never re-exported.
 * - starter/no-protected-suppression: architecture, async-safety and
 *   restricted-API rules cannot be silenced with inline comments.
 */
import path from 'node:path';

const UI_DOCS = 'See docs/ui/foundation.md#public-components-and-internals.';

/**
 * True when `tag` is `styled.x`, `styled(X)`, or either with `.attrs(...)` /
 * `.withConfig(...)` chained.
 *
 * @param {any} node
 * @returns {boolean}
 */
const isStyledTag = (node) => {
  let current = node;
  while (current) {
    if (current.type === 'Identifier') return current.name === 'styled';
    if (current.type === 'MemberExpression') current = current.object;
    else if (current.type === 'CallExpression') current = current.callee;
    else return false;
  }
  return false;
};

/** @type {import('eslint').Rule.RuleModule} */
const styledElementNames = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Styled elements are named _<Component><Part> after their owning component folder',
    },
    schema: [],
  },
  create(context) {
    const file = context.filename;
    if (!/[\\/]styles\.tsx?$/.test(file)) return {};
    const owner = path.basename(path.dirname(file));
    const valid = new RegExp(`^_${owner}(?:[A-Z0-9][A-Za-z0-9]*)?$`);
    return {
      VariableDeclarator(node) {
        const init = /** @type {any} */ (node.init);
        if (
          node.id.type !== 'Identifier' ||
          init?.type !== 'TaggedTemplateExpression' ||
          !isStyledTag(init.tag)
        ) {
          return;
        }
        const { name } = node.id;
        if (valid.test(name)) return;
        const part = name
          .replace(/^_+/, '')
          .replace(new RegExp(`^${owner}`), '');
        const suggestion = `_${owner}${part.charAt(0).toUpperCase()}${part.slice(1) || 'Root'}`;
        context.report({
          node: node.id,
          message: `Styled element "${name}" in ${owner}/${path.basename(file)} must be named _${owner}<Part> (e.g. ${suggestion}): internal elements carry their owning component's name so reviewers can tell them from public components. ${UI_DOCS}`,
        });
      },
    };
  },
};

const isInternalName = (/** @type {string} */ name) => /^_[A-Z]/.test(name);
const isOwnStyles = (/** @type {unknown} */ source) =>
  typeof source === 'string' && /^\.\/styles(?:\.tsx?)?$/.test(source);

/** @type {import('eslint').Rule.RuleModule} */
const noInternalStyledImports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        '`_` styled elements are imported only from ./styles inside their own component and never re-exported',
    },
    schema: [],
  },
  create(context) {
    const owner = path.basename(path.dirname(context.filename));
    return {
      ImportSpecifier(node) {
        const parent = /** @type {any} */ (node).parent;
        const imported =
          node.imported.type === 'Identifier'
            ? node.imported.name
            : String(node.imported.value);
        if (!isInternalName(imported) || isOwnStyles(parent.source.value)) {
          return;
        }
        context.report({
          node,
          message: `"${imported}" is an internal styled element of another component (imported from "${String(parent.source.value)}"). Compose that component's public API, or create a local _${owner}<Part> wrapper in this folder's styles.ts. ${UI_DOCS}`,
        });
      },
      ExportSpecifier(node) {
        const local =
          node.local.type === 'Identifier'
            ? node.local.name
            : String(node.local.value);
        if (!isInternalName(local)) return;
        context.report({
          node,
          message: `"${local}" is internal to ${owner}: \`_\` elements are never exported beyond styles.ts. If other components need this building block, give it a public name (a component in its own folder with an index). ${UI_DOCS}`,
        });
      },
    };
  },
};

/** Rules that keep the architecture and async safety meaningful. */
const PROTECTED = [
  /^boundaries\//,
  /^starter\//,
  /^import\/(no-cycle|no-extraneous-dependencies)$/,
  /^no-restricted-(imports|syntax|globals|properties)$/,
  /^@typescript-eslint\/(no-explicit-any|no-floating-promises|no-misused-promises|ban-ts-comment|no-unsafe-[a-z-]+)$/,
  /^react-hooks\/rules-of-hooks$/,
];

/** @type {import('eslint').Rule.RuleModule} */
const noProtectedSuppression = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Architecture and safety rules cannot be disabled or reconfigured inline',
    },
    schema: [],
  },
  create(context) {
    return {
      Program() {
        for (const comment of context.sourceCode.getAllComments()) {
          const match =
            /^\s*(eslint-disable(?:-next-line|-line)?|eslint)(?:\s+([\s\S]*?))?\s*(?:--[\s\S]*)?$/.exec(
              comment.value,
            );
          if (!match) continue;
          const [, directive = '', body = ''] = match;
          const rules =
            directive === 'eslint'
              ? [...body.matchAll(/([@\w/-]+)\s*:/g)].map((m) => m[1] ?? '')
              : body
                  .split(',')
                  .map((rule) => rule.trim())
                  .filter(Boolean);
          if (directive !== 'eslint' && rules.length === 0) {
            context.report({
              loc: comment.loc ?? { line: 1, column: 0 },
              message: `A blanket "${directive}" hides every rule, including the architecture checks. Name the rule you need and explain why after "--"; protected rules cannot be disabled (docs/guardrails.md#when-a-check-fails).`,
            });
            continue;
          }
          for (const rule of rules) {
            if (!PROTECTED.some((pattern) => pattern.test(rule))) continue;
            context.report({
              loc: comment.loc ?? { line: 1, column: 0 },
              message: `"${rule}" is a protected rule and cannot be ${directive === 'eslint' ? 'reconfigured' : 'disabled'} inline. Fix the code (the rule's message names the approved alternative), or change the rule deliberately in eslint/ with a fixture and say why (docs/guardrails.md#when-a-check-fails).`,
            });
          }
        }
      },
    };
  },
};

export const starterPlugin = {
  meta: { name: 'starter' },
  rules: {
    'styled-element-names': styledElementNames,
    'no-internal-styled-imports': noInternalStyledImports,
    'no-protected-suppression': noProtectedSuppression,
  },
};
