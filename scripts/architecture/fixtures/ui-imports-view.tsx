// @fixture-path src/components/__arch__/UsesView.tsx
// @expect boundaries/dependencies: ui (src/components) must not import view (src/views)
import { NotFound } from 'views/system/NotFound';

export const UsesView = () => <NotFound />;
