// DEMO: removed by `pnpm adopt --remove-demo`. See docs/adoption.md.
import { paths } from 'globals/paths';
import type { RouteType } from 'globals/types';
import { OnboardingRoutes } from 'views/onboarding';

const loadDemoHub = () =>
  import('./DemoHub').then(({ DemoHub }) => ({ Component: DemoHub }));

/**
 * Guest routes added in demo builds only (see containers/routing/routeTable):
 * - DemoHub replaces the guest start page and keeps the /demo alias.
 * - The onboarding flow is reachable without signing in as a preview. Its
 *   final step returns guests to the start (it never grants access).
 *
 * A function (not a module-level array) with a lazy DemoHub, so non-demo
 * bundles — where routeTable never calls it — contain none of this code.
 */
export const createDemoGuestRoutes = (): RouteType[] => [
  { path: paths.index, lazy: loadDemoHub },
  { path: paths.demo, lazy: loadDemoHub },
  ...OnboardingRoutes,
];
