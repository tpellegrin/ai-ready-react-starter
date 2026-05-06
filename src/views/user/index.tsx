import { RouteType } from 'globals/types';
import { paths } from 'globals/paths';

import { Dashboard } from './Dashboard';

export const UserRoutes: RouteType[] = [
  {
    path: paths.dashboard,
    Component: Dashboard,
  },
];
