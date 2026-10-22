// @fixture-path src/views/__arch__/UsesDemo.tsx
// @expect boundaries/dependencies: view (src/views) must not import demo (src/demo)
// Production views never depend on demo code (removed on adoption).
import { createDemoGuestRoutes } from 'demo/routes';

export const routes = createDemoGuestRoutes;
