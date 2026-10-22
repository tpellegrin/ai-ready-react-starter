import type { RequestHandler } from 'msw';

import { sessionHandlers } from './session';

// starter:reference-start
import { resourceDb, resourceHandlers } from 'features/resources/mocks';
// starter:reference-end
// starter:gen mock-imports (`pnpm gen feature` adds imports above this line)

/**
 * Reference API handlers, aggregated from the features that own them.
 * Each feature keeps its handlers, fixtures and in-memory data next to its
 * code (src/features/<feature>/mocks) and registers them here.
 */
export const handlers: RequestHandler[] = [
  ...sessionHandlers,
  // starter:reference-start
  ...resourceHandlers,
  // starter:reference-end
  // starter:gen mock-handlers
];

/** Reset every feature's in-memory mock data (called between tests). */
export const resetMockData = () => {
  // Mocks that keep mutable data (an in-memory store behind mutations)
  // export a reset and call it here.
  // starter:reference-start
  resourceDb.reset();
  // starter:reference-end
};
