// starter:demo-start
import { DEMO_MODE } from 'config';
import { createDemoGuestRoutes } from 'demo/routes';
import type { RouteType } from 'globals/types';
// starter:demo-end
import { GuestRoutes } from 'views/guest';
import { OnboardingRoutes } from 'views/onboarding';
import { UserRoutes } from 'views/user';

import type { RouteTable } from './types';

// starter:demo-start
/** Later routes replace earlier ones with the same path. */
export const mergeRoutes = (
  base: readonly RouteType[],
  overrides: readonly RouteType[],
): RouteType[] => {
  const overridden = new Set(overrides.map((route) => route.path));
  return [...base.filter((route) => !overridden.has(route.path)), ...overrides];
};
// starter:demo-end

/**
 * The application's route groups; AppRouter mounts one router per group
 * (guest, onboarding, user) based on the session.
 */
export const routeTable: RouteTable = {
  // starter:demo-start
  // Demo routes (DemoHub start page, public onboarding preview) exist only in
  // demo builds: DEMO_MODE is a build-time constant, so other bundles drop
  // them entirely.
  guest: mergeRoutes(GuestRoutes, DEMO_MODE ? createDemoGuestRoutes() : []),
  // starter:demo-else
  // guest: GuestRoutes,
  // starter:demo-end
  onboarding: OnboardingRoutes,
  user: UserRoutes,
};
