import { apiClient } from 'api/client';
import { emptyResponse } from 'api/http';

import {
  resourceListSchema,
  resourceSchema,
  type Resource,
  type ResourceFilter,
  type ResourceInput,
} from './model';

/**
 * Resource endpoints. Each call names the schema its response must match,
 * and passes the AbortSignal through so query cancellation aborts requests.
 */
export const fetchResources = async (
  filter: ResourceFilter,
  signal?: AbortSignal,
): Promise<Resource[]> => {
  const { items } = await apiClient.request({
    path: '/resources',
    query: { status: filter === 'all' ? undefined : filter },
    schema: resourceListSchema,
    signal,
  });
  return items;
};

export const createResource = (input: ResourceInput) =>
  apiClient.request({
    method: 'POST',
    path: '/resources',
    body: input,
    schema: resourceSchema,
  });

export const updateResource = (id: string, input: ResourceInput) =>
  apiClient.request({
    method: 'PUT',
    path: `/resources/${encodeURIComponent(id)}`,
    body: input,
    schema: resourceSchema,
  });

export const deleteResource = (id: string) =>
  apiClient.request({
    method: 'DELETE',
    path: `/resources/${encodeURIComponent(id)}`,
    schema: emptyResponse,
  });
