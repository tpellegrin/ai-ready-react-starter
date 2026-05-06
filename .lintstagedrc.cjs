module.exports = {
  '*.{ts,tsx}': [
    "eslint --ignore-pattern '!*' --fix --max-warnings=0",
    'jest --findRelatedTests --passWithNoTests',
  ],
  '*.{html,md,json,yml}': ['prettier --write'],
  '*.svg': ['prettier --write --parser html'],
  '**/*.ts?(x)': () => 'tsc -p tsconfig.json --noEmit',
  // Uncomment to enable stylelint
  // 'styles.ts': 'stylelint --fix --config .stylelintrc.cjs',
};
