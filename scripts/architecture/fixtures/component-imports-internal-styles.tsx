// @fixture-path src/views/__arch__/Account/index.tsx
// @expect starter/no-internal-styled-imports: "_ArchFixtureWidgetRoot" is an internal styled element
// @expect boundaries/dependencies: Component boundary: _ArchFixtureWidgetRoot from "components/ArchFixtureWidget/styles" is internal to ArchFixtureWidget
// Reaching into another component's styled elements bypasses its API.
import { _ArchFixtureWidgetRoot } from 'components/ArchFixtureWidget/styles';

export const Account = () => <_ArchFixtureWidgetRoot />;
