import { queryOptions } from '@tanstack/react-query';

import { fetch__Entity__List } from './api';

/** Query keys owned by this feature (hierarchical, for invalidation). */
export const __entity__Keys = {
  all: ['__feature_path__'] as const,
  list: () => [...__entity__Keys.all, 'list'] as const,
};

export const __entity__ListQuery = () =>
  queryOptions({
    queryKey: __entity__Keys.list(),
    queryFn: ({ signal }) => fetch__Entity__List(signal),
  });
