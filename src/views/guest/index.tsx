import { paths } from 'globals/paths';
import type { RouteType } from 'globals/types';

import { Welcome } from './Welcome';

export const GuestRoutes: RouteType[] = [
  { path: paths.index, Component: Welcome },
  // Code-split: the form stack (react-hook-form, schemas) loads on demand.
  {
    path: paths.signIn,
    lazy: () =>
      import('./SignIn').then(({ SignIn }) => ({ Component: SignIn })),
  },
  { path: paths.welcome, Component: Welcome },
];
