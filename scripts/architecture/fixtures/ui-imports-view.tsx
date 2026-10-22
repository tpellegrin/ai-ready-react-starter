// @fixture-path src/components/__arch__/UsesView.tsx
// @expect boundaries/dependencies: ui (src/components/__arch__) must not import view (src/views)
import { NotFound } from 'views/system/NotFound';

export const UsesView = () => <NotFound />;
