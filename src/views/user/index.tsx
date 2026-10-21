import { paths } from 'globals/paths';
import type { RouteType } from 'globals/types';

import { Dashboard } from './Dashboard';

export const UserRoutes: RouteType[] = [
  { path: paths.dashboard, Component: Dashboard },
  // starter:reference-start
  // Code-split so the feature (forms, dialogs) loads on demand.
  {
    path: paths.resources,
    lazy: () =>
      import('./Resources').then(({ Resources }) => ({ Component: Resources })),
  },
  // starter:reference-end
];
