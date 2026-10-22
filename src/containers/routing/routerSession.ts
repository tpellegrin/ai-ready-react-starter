import {
  getSafeReturnTo,
  matchesAnyPattern,
} from 'globals/navigation/returnTo';
import { RouterType } from 'globals/types';

import type { RouteTable } from './types';

/**
 * Which route group is mounted, where its router starts, and a destination
 * waiting for the user group (see nextRouterSession).
 */
export type RouterSession = {
  /** null until the session is known (nothing is routed while restoring). */
  group: RouterType | null;
  startPath: string;
  /** Validated user-group path to open once onboarding completes. */
  pendingDestination: string | null;
};

const splitPath = (path: string) => {
  const index = path.search(/[?#]/);
  return index === -1
    ? { pathname: path, search: '' }
    : { pathname: path.slice(0, index), search: path.slice(index) };
};

const patternsOf = (routes: RouteTable, group: RouterType) =>
  routes[group].map((route) => route.path);

/**
 * Where a user who must finish onboarding first wanted to go: a safe
 * `returnTo` for the user group (sign-in after a protected deep link), or the
 * protected path itself (a deep link restored from an existing session).
 */
const destinationAfterOnboarding = (
  lastPath: string,
  routes: RouteTable,
): string | null => {
  const userPatterns = patternsOf(routes, RouterType.user);
  const { pathname, search } = splitPath(lastPath);
  const returnTo = getSafeReturnTo(search, userPatterns);
  if (returnTo) return returnTo;
  const isUserOnly =
    matchesAnyPattern(pathname, userPatterns) &&
    !matchesAnyPattern(pathname, [
      ...patternsOf(routes, RouterType.guest),
      ...patternsOf(routes, RouterType.onboarding),
    ]);
  return isUserOnly ? lastPath : null;
};

/**
 * The router session after the auth state selects `group`.
 *
 * - The next router starts where the previous one ended (`lastPath`), so the
 *   unknown-route policy can honor `returnTo` (docs/routing.md).
 * - Entering onboarding keeps the user's destination aside; the onboarding
 *   flow itself always starts at its first step.
 * - Leaving onboarding for the user group opens that destination (it was
 *   validated against the user routes); signing out discards it.
 *
 * Pure, so the swap is safe to compute during render (Strict Mode replays
 * renders) and easy to test.
 */
export const nextRouterSession = (
  current: RouterSession,
  group: RouterType,
  lastPath: string,
  routes: RouteTable,
): RouterSession => {
  if (current.group === group) return current;
  switch (group) {
    case RouterType.guest:
      return { group, startPath: lastPath, pendingDestination: null };
    case RouterType.onboarding:
      return {
        group,
        startPath: lastPath,
        pendingDestination:
          destinationAfterOnboarding(lastPath, routes) ??
          current.pendingDestination,
      };
    case RouterType.user:
      return {
        group,
        startPath: current.pendingDestination ?? lastPath,
        pendingDestination: null,
      };
  }
};
