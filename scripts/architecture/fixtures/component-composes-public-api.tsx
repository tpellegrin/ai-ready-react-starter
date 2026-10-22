// @fixture-path src/views/__arch__/Profile/index.tsx
// @expect none
// Views compose shared components through their public API and style
// feature-specific structure with local `_<Owner>` wrappers.
import { ArchFixtureWidget } from 'components/ArchFixtureWidget';

import { _ProfileCard, _ProfileRoot } from './styles';

export const Profile = () => (
  <_ProfileRoot>
    <_ProfileCard label="Ada" />
    <ArchFixtureWidget label="Plain" />
  </_ProfileRoot>
);
