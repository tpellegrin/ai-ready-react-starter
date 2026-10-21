// @fixture-path src/__arch__/thing.ts
// @expect boundaries/no-unknown-files: does not belong to any known element
// New top-level folders must be classified (eslint/boundaries.js + tsconfig paths).
export const thing = 1;
