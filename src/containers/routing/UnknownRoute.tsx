import { Navigate, useLocation } from 'react-router-dom';

import { NotFound } from 'views/system/NotFound';

import {
  buildSignInRedirect,
  getSafeReturnTo,
  matchesAnyPattern,
} from 'globals/navigation/returnTo';

export type UnknownRoutePolicy = {
  /** Routes of this group: valid `returnTo` targets. */
  ownPatterns: readonly string[];
  /** Routes owned by other groups: leaving them goes to `home`. */
  otherPatterns: readonly string[];
  /** Guest only: paths that require signing in (sent to sign-in with returnTo). */
  protectedPatterns?: readonly string[] | undefined;
  signInPath?: string | undefined;
  home: string;
  /** Render a Not Found page for paths no group defines (else go home). */
  showNotFound: boolean;
};

/**
 * Renders for any path the current route group does not define. Because
 * route groups swap with auth state, this is also where a pending
 * destination (`?returnTo=`) is honored after sign-in.
 */
export const UnknownRoute = ({ policy }: { policy: UnknownRoutePolicy }) => {
  const location = useLocation();

  const returnTo = getSafeReturnTo(location.search, policy.ownPatterns);
  if (returnTo) return <Navigate to={returnTo} replace />;

  if (
    policy.signInPath &&
    policy.protectedPatterns &&
    matchesAnyPattern(location.pathname, policy.protectedPatterns)
  ) {
    return (
      <Navigate to={buildSignInRedirect(policy.signInPath, location)} replace />
    );
  }

  if (matchesAnyPattern(location.pathname, policy.otherPatterns)) {
    return <Navigate to={policy.home} replace />;
  }

  return policy.showNotFound ? (
    <NotFound />
  ) : (
    <Navigate to={policy.home} replace />
  );
};
