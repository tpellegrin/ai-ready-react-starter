import { useState } from 'react';

import { useAuth } from 'auth/useAuth';
import { runDetached } from 'utils/async';

/**
 * Sign-out with visible pending and failure states. The session ends only
 * after the server confirms it; until then the user stays signed in and can
 * retry (docs/session-lifecycle.md).
 */
export const useSignOut = () => {
  const { signOut } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [failed, setFailed] = useState(false);

  const handleSignOut = () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    setFailed(false);
    runDetached(
      signOut().then(
        // On success AppRouter swaps to the guest routes.
        () => setIsSigningOut(false),
        () => {
          setIsSigningOut(false);
          setFailed(true);
        },
      ),
    );
  };

  return {
    isSigningOut,
    signOutErrorKey: failed ? ('auth.signOut.error' as const) : null,
    handleSignOut,
  };
};
