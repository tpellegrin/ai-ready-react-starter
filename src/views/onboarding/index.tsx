import { RouteType } from 'globals/types';
import { paths } from 'globals/paths';
import { Welcome } from './Welcome';
import { Preferences } from './Preferences';
import { Complete } from './Complete';

/**
 * Maintainer/AI note:
 * All onboarding routes use the /flow/ prefix so AppRouter routes them through
 * CenterTransitionShell (LTR/RTL slide transitions). The step order here must
 * match the key order in paths.flow.onboarding, which is what useFlowNav and
 * useFlowProgress use to compute next/prev and progress percentage.
 */
export const OnboardingRoutes: RouteType[] = [
  {
    path: paths.onboarding.welcome,
    Component: Welcome,
  },
  {
    path: paths.onboarding.preferences,
    Component: Preferences,
  },
  {
    path: paths.onboarding.complete,
    Component: Complete,
  },
];
