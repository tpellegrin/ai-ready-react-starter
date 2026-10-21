import { appConfig } from 'config';

import { createHttpClient } from './http';

/**
 * The application's HTTP client for its own API (VITE_API_BASE_URL).
 * `credentials: 'include'` lets cookie sessions work when the API is on a
 * different origin (the server must allow credentialed CORS).
 */
export const apiClient = createHttpClient({
  baseUrl: appConfig.apiBaseUrl,
  credentials: 'include',
});
