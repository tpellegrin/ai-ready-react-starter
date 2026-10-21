import { apiClient } from 'api/client';

import { __entity__ListSchema, type __Entity__ } from './model';

/**
 * Endpoints of this feature. Each call names the schema its response must
 * match and passes the AbortSignal through, so query cancellation aborts it.
 */
export const fetch__Entity__List = async (
  signal?: AbortSignal,
): Promise<__Entity__[]> => {
  const { items } = await apiClient.request({
    path: '/__feature_path__',
    schema: __entity__ListSchema,
    signal,
  });
  return items;
};
