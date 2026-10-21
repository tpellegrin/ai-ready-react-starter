/**
 * A lazy route's chunk failed to load: typically a deploy replaced the hashed
 * files this tab still references, or the network dropped. Reloading fetches
 * the current version. Messages differ per browser (Chromium, Firefox, Safari).
 */
const CHUNK_LOAD_MESSAGES = [
  'Failed to fetch dynamically imported module',
  'error loading dynamically imported module',
  'Importing a module script failed',
];

export const isChunkLoadError = (error: unknown): boolean =>
  error instanceof Error &&
  CHUNK_LOAD_MESSAGES.some((message) => error.message.includes(message));
