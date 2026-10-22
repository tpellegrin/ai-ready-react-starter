import type { QueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { isUnauthenticatedError } from 'api/http';
import { useAuth } from 'auth/useAuth';
import { runDetached } from 'utils/async';

/**
 * Applies the session policy to server state (docs/session-lifecycle.md):
 * while signed in, a 401 from any query or mutation re-checks the session
 * (AuthProvider shares one check between concurrent failures).
 *
 * - The server has no session → it ends as "expired": caches are cleared and
 *   the guest router sends the user to sign-in for the current page.
 * - The session is still valid, or the check fails (offline, timeout) → the
 *   session stays; the failed request shows its own error in place.
 *
 * Other statuses (403, 404, 5xx) never touch the session. Requests made
 * outside TanStack Query are not observed — keep server state in queries
 * and mutations (docs/recipes/data-and-forms.md).
 */
export const SessionMonitor = ({
  queryClient,
}: {
  queryClient: QueryClient;
}) => {
  const { status, verifySession } = useAuth();

  useEffect(() => {
    if (status !== 'authenticated') return;
    const onError = (error: unknown) => {
      if (!isUnauthenticatedError(error)) return;
      // A failed check keeps the session; the request already shows its error.
      runDetached(verifySession(), () => undefined);
    };
    const stopQueries = queryClient.getQueryCache().subscribe((event) => {
      if (event.type === 'updated' && event.action.type === 'error') {
        onError(event.action.error);
      }
    });
    const stopMutations = queryClient.getMutationCache().subscribe((event) => {
      if (event.type === 'updated' && event.action.type === 'error') {
        onError(event.action.error);
      }
    });
    return () => {
      stopQueries();
      stopMutations();
    };
  }, [status, queryClient, verifySession]);

  return null;
};
