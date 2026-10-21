// @fixture-path src/features/__arch__/crossFeature.ts
// @expect boundaries/dependencies: never from another feature
// Features are independent, even through a public API: compose them in a view.
export { sampleLabel } from 'features/arch-fixture-feature';
