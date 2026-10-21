import { useQuery } from '@tanstack/react-query';

import { getErrorMessageKey } from 'api/http';
import { runDetached } from 'utils/async';

import { __entity__ListQuery } from '../../queries';

/** Server state lives in TanStack Query; the view is derived during render. */
export const use__Feature__Panel = () => {
  const list = useQuery(__entity__ListQuery());

  const view = list.isPending
    ? 'pending'
    : list.isError
      ? 'error'
      : list.data.length === 0
        ? 'empty'
        : 'success';

  return {
    view,
    items: list.data ?? [],
    errorKey: list.isError ? getErrorMessageKey(list.error) : null,
    isRetrying: list.isFetching,
    retry: () => runDetached(list.refetch()),
  };
};
