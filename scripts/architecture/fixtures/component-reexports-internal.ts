// @fixture-path src/components/__arch__/reexportLogic.ts
// @expect boundaries/dependencies: Component boundary: useArchFixtureWidget from "components/ArchFixtureWidget/logic"
// Re-exporting internals publishes them under another name; still rejected.
export { useArchFixtureWidget } from 'components/ArchFixtureWidget/logic';
