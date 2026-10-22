// @fixture-path src/views/__arch__/suppressed.ts
// @expect starter/no-protected-suppression: "boundaries/dependencies" is a protected rule
// Disabling an architecture rule inline is itself an error.
// eslint-disable-next-line boundaries/dependencies -- just this once
export { useArchFixtureWidget } from 'components/ArchFixtureWidget/logic';
