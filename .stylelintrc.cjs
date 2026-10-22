module.exports = {
  extends: ['stylelint-config-standard'],
  customSyntax: 'postcss-styled-syntax',
  plugins: [
    'stylelint-order',
    'stylelint-config-rational-order/plugin',
    'stylelint-use-logical',
  ],
  rules: {
    // Colors come from theme tokens (src/styles/themes); keywords such as
    // transparent and currentcolor stay allowed.
    'color-no-hex': [
      true,
      {
        message:
          'Raw color value: use a theme token (theme.colors.*); colors are defined in src/styles/themes.',
      },
    ],
    'color-named': [
      'never',
      {
        message:
          'Named color: use a theme token (theme.colors.*); colors are defined in src/styles/themes.',
      },
    ],
    'function-disallowed-list': [
      ['rgb', 'rgba', 'hsl', 'hsla', 'hwb', 'lab', 'lch', 'oklab', 'oklch'],
      {
        message:
          'Raw color function: use a theme token (theme.colors.*); colors are defined in src/styles/themes.',
      },
    ],
    // Motion opts in per property (docs/animation-system.md, global clamp).
    'declaration-property-value-disallowed-list': [
      {
        transition: ['/(^|[\\s,])all([\\s,]|$)/'],
        'transition-property': ['/(^|[\\s,])all([\\s,]|$)/'],
      },
      {
        message:
          'Do not transition "all": name the properties (transform, opacity, …) and opt in with data-allow-* (docs/animation-system.md).',
      },
    ],
    'order/properties-order': [],
    'plugin/rational-order': [
      true,
      {
        'border-in-box-model': false,
        'empty-line-between-groups': false,
      },
    ],
    'unit-disallowed-list': [
      ['px'],
      {
        ignoreProperties: {
          px: ['/^border/', 'box-shadow', 'clip', 'background'],
        },
        severity: 'warning',
      },
    ],
    'no-duplicate-selectors': null,
    'function-no-unknown': null,
    'no-descending-specificity': null,
    'no-empty-source': null,
    'length-zero-no-unit': true,
    'selector-class-pattern': null,
    'value-keyword-case': null,
    'nesting-selector-no-missing-scoping-root': null,
    'property-no-deprecated': null,
    'declaration-block-no-redundant-longhand-properties': null,
    'declaration-empty-line-before': null,
  },
};
