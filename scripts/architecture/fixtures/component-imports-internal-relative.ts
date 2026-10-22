// @fixture-path src/components/__arch__/usesWidgetLogic.ts
// @expect boundaries/dependencies: Component boundary: useArchFixtureWidget from "../ArchFixtureWidget/logic" is internal to ArchFixtureWidget (logic.ts)
// A relative path resolves to the same file: logic.ts is still private.
import { useArchFixtureWidget } from '../ArchFixtureWidget/logic';

export const useLabel = () => useArchFixtureWidget('x').text;
