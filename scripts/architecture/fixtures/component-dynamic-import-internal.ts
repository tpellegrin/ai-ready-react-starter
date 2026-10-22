// @fixture-path src/views/__arch__/lazyInternals.ts
// @expect boundaries/dependencies: Component boundary: "components/ArchFixtureWidget/styles" is internal to ArchFixtureWidget
// import() is checked like a static import.
export const loadInternals = () =>
  import('components/ArchFixtureWidget/styles');
