import { QueryClient, type DefaultOptions } from '@tanstack/react-query';

import { isRetryableError } from './http';

const MAX_QUERY_RETRIES = 2;

/**
 * Bounded retry policy for queries: retry only failures that retrying can fix
 * (connectivity, 408/429, 5xx), at most twice. Mutations are never retried
 * automatically (they may not be idempotent).
 */
export const shouldRetryQuery = (failureCount: number, error: unknown) =>
  failureCount < MAX_QUERY_RETRIES && isRetryableError(error);

export const queryClientDefaults: DefaultOptions = {
  queries: {
    retry: shouldRetryQuery,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  },
  mutations: {
    retry: false,
  },
};

/** One client per app (created in main.tsx); tests create their own. */
export const createQueryClient = () =>
  new QueryClient({ defaultOptions: queryClientDefaults });

/**
 * Session boundary: drop everything cached for the previous identity.
 * `clear()` removes every query and mutation; removing a query cancels its
 * in-flight fetch and aborts the signal passed to the query function, so a
 * late response from the previous session can never repopulate the cache.
 */
export const resetSessionCache = (queryClient: QueryClient) => {
  queryClient.clear();
};
