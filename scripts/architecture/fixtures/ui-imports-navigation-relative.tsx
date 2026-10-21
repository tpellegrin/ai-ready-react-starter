// @fixture-path src/components/__arch__/UsesNavigationRelative.tsx
// @expect boundaries/dependencies: ui (src/components) must not import navigation (src/globals)
// A relative path resolves to the same file, so it cannot bypass the rule.
import { useNavigation } from '../../globals/context/NavigationContext';

export const UsesNavigationRelative = () => <p>{useNavigation().navEpoch}</p>;
