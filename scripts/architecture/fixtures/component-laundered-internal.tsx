// @fixture-path src/views/__arch__/Laundered.tsx
// @expect starter/no-internal-styled-imports: "_ArchFixtureWidgetRoot" is an internal styled element
// @expect boundaries/dependencies: Component boundary: _ArchFixtureWidgetRoot from "components/ArchFixtureWidget/internal"
// A `_` element re-exported through another module is still internal.
import { _ArchFixtureWidgetRoot } from 'components/ArchFixtureWidget/internal';

export const Laundered = () => <_ArchFixtureWidgetRoot />;
