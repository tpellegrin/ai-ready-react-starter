// @fixture-path src/mocks/__arch__/aggregate.ts
// @expect boundaries/dependencies: is internal to feature "arch-fixture-feature"
// The mock registry uses each feature's mock entry (mocks/index.ts) only.
export { sampleFixtures } from 'features/arch-fixture-feature/mocks/fixtures';
