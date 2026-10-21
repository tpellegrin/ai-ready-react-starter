import { MOCKS_ENABLED } from 'config';

/**
 * Starts the MSW browser worker before the app renders, in mock-enabled
 * builds only (dev and the demo build). MOCKS_ENABLED is a build-time
 * constant: other builds drop this branch, the dynamic import and the worker.
 */
export const startMocking = async (): Promise<void> => {
  if (MOCKS_ENABLED) {
    const { startMockWorker } = await import('mocks/browser');
    await startMockWorker();
  }
};
