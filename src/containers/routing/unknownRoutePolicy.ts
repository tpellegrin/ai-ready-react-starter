import { RouterType } from 'globals/types';

import type { RouteTable } from './types';
import type { UnknownRoutePolicy } from './UnknownRoute';

/**
 * Unknown-route behavior per group (documented in docs/routing.md):
 * - guest: protected paths → sign-in with returnTo; unknown → Not Found.
 * - user: safe returnTo → destination; guest/onboarding-only paths → home;
 *   unknown → Not Found.
 * - onboarding: safe returnTo → destination; anything else → first step.
 */
export const createUnknownRoutePolicy = (
  group: RouterType,
  routes: RouteTable,
  signInPath: string,
): UnknownRoutePolicy => {
  const own = routes[group].map((route) => route.path);
  const others = Object.values(RouterType)
    .filter((other) => other !== group)
    .flatMap((other) => routes[other].map((route) => route.path))
    .filter((path) => !own.includes(path));

  switch (group) {
    case RouterType.guest:
      return {
        ownPatterns: own,
        otherPatterns: [],
        protectedPatterns: others,
        signInPath,
        home: '/',
        showNotFound: true,
      };
    case RouterType.user:
      return {
        ownPatterns: own,
        otherPatterns: others,
        home: '/',
        showNotFound: true,
      };
    case RouterType.onboarding:
      return {
        ownPatterns: own,
        otherPatterns: others,
        home: own[0] ?? '/',
        showNotFound: false,
      };
  }
};
