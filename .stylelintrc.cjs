module.exports = {
  extends: ['stylelint-config-standard'],
  customSyntax: 'postcss-styled-syntax',
  plugins: [
    'stylelint-order',
    'stylelint-config-rational-order/plugin',
    'stylelint-use-logical',
  ],
  rules: {
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
