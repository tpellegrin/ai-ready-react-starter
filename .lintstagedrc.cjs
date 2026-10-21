// Pre-commit: fast checks on staged files only. CI runs the full gates.
module.exports = {
  '*.{ts,tsx,js,mjs,cjs}': [
    'eslint --fix --max-warnings=0 --no-warn-ignored',
    'prettier --write',
  ],
  '*.{json,md,yml,yaml,html,css}': ['prettier --write'],
  'src/**/*.{ts,tsx}': [
    'stylelint --allow-empty-input',
    () => 'tsc -b',
    'vitest related --run --project unit --passWithNoTests',
  ],
};
