import {
  queryOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';

import {
  createResource,
  deleteResource,
  fetchResources,
  updateResource,
} from './api';
import type { ResourceFilter, ResourceInput } from './model';

/**
 * Query keys owned by this feature (no global registry). Hierarchical, so
 * `resourceKeys.lists()` invalidates every filtered list at once.
 */
export const resourceKeys = {
  all: ['resources'] as const,
  lists: () => [...resourceKeys.all, 'list'] as const,
  list: (filter: ResourceFilter) => [...resourceKeys.lists(), filter] as const,
};

export const resourceListQuery = (filter: ResourceFilter) =>
  queryOptions({
    queryKey: resourceKeys.list(filter),
    queryFn: ({ signal }) => fetchResources(filter, signal),
  });

/**
 * Create (no id) or update. Waits for the list refetch before resolving, so
 * the UI never shows a stale list after "saved". Not retried automatically.
 */
export const useSaveResource = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id?: string | undefined;
      input: ResourceInput;
    }) => (id ? updateResource(id, input) : createResource(input)),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: resourceKeys.lists() }),
  });
};

export const useDeleteResource = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteResource(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: resourceKeys.lists() }),
  });
};
