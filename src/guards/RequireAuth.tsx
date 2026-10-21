import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { useAuth } from 'auth/useAuth';
import { buildSignInRedirect } from 'globals/navigation/returnTo';
import { paths } from 'globals/paths';

/**
 * Explicit guard for a route that must require auth inside a group that is
 * otherwise public. Prefer the implicit guards of AppRouter's route groups.
 * Like every client-side check, this is UX only: the server authorizes.
 */
export const RequireAuth = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated, isInitialized } = useAuth();
  const location = useLocation();
  // Never decide before the session is known (a refresh would bounce
  // signed-in users to sign-in).
  if (!isInitialized) return null;
  if (!isAuthenticated) {
    return (
      <Navigate to={buildSignInRedirect(paths.signIn, location)} replace />
    );
  }
  return children;
};
