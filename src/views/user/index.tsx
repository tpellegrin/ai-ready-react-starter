import { paths } from 'globals/paths';
import type { RouteType } from 'globals/types';

import { Dashboard } from './Dashboard';
// starter:gen route-imports (`pnpm gen` adds view imports above)

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
  // starter:gen routes (`pnpm gen view|flow` registers routes above)
];
