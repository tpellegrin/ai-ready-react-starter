import { setupWorker } from 'msw/browser';

import { basePath } from 'config';

import { getUnhandledRequest } from './frames';
import { handlers } from './handlers';

/**
 * Starts the reference API in the browser (dev and demo builds only; see
 * containers/composition/startMocking.ts). The worker script is served and
 * emitted by the msw/vite plugin under the app's base path.
 */
export const startMockWorker = async () => {
  const worker = setupWorker(...handlers);
  await worker.start({
    serviceWorker: {
      url: `${basePath}mockServiceWorker.js`,
      options: { scope: basePath },
    },
    // Unknown /api calls are bugs worth seeing; assets and HMR pass through.
    onUnhandledFrame({ frame, defaults }) {
      const request = getUnhandledRequest(frame);
      if (request && new URL(request.url).pathname.includes('/api/')) {
        defaults.warn();
      }
    },
    quiet: true,
  });
  return worker;
};
