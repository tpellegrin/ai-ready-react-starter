import { RouteType } from 'globals/types';
import { paths } from 'globals/paths';
import { SignIn } from './SignIn';
import { Welcome } from './Welcome';
// DEMO: starter overview, safe to remove. See docs/adoption.md.
import { DemoHub } from './DemoHub';

export const GuestRoutes: RouteType[] = [
  // DEMO: Starter Overview is the default first screen for the boilerplate.
  // It is safe to remove when adopting: replace this route's Component with
  // your own landing page (or with `Welcome`). See docs/adoption.md.
  {
    path: paths.index,
    Component: DemoHub,
  },
  {
    path: paths.signIn,
    Component: SignIn,
  },
  {
    path: paths.welcome,
    Component: Welcome,
  },
  // DEMO: starter overview alias, kept so existing links/tests to /demo still
  // resolve. Safe to remove. See docs/adoption.md.
  {
    path: paths.demo,
    Component: DemoHub,
  },
];
