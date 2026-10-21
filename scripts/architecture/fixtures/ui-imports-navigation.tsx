// @fixture-path src/components/__arch__/UsesNavigation.tsx
// @expect boundaries/dependencies: ui (src/components) must not import navigation (src/globals)
// Shared UI must not depend on app navigation state.
import { useNavigation } from 'globals/context/NavigationContext';

export const UsesNavigation = () => <p>{useNavigation().navEpoch}</p>;
