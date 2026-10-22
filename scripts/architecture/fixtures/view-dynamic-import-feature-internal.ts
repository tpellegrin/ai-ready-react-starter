// @fixture-path src/views/__arch__/lazyFeature.ts
// @expect boundaries/dependencies: is internal to feature "arch-fixture-feature"
// Lazy routes load a feature through its public API, too.
export const loadWidget = () =>
  import('features/arch-fixture-feature/components/SampleWidget');
