import { useSearchParams } from 'react-router-dom';

import { parseResourceFilter, type ResourceFilter } from 'features/resources';

/**
 * The list filter is shareable navigation state, so it lives in the URL
 * (`?status=archived`) and is derived during render. Updates replace the
 * history entry so the filter doesn't flood back/forward.
 */
export const useResourceFilterParam = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const filter = parseResourceFilter(searchParams.get('status'));

  const setFilter = (next: ResourceFilter) => {
    setSearchParams(
      (current) => {
        const params = new URLSearchParams(current);
        if (next === 'all') params.delete('status');
        else params.set('status', next);
        return params;
      },
      { replace: true },
    );
  };

  return { filter, setFilter };
};
