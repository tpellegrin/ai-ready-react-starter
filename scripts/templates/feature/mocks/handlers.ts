import { delay, http, HttpResponse } from 'msw';

import { appConfig } from 'config';
import { consumeFault } from 'mocks/faults';

import { __entity__Fixtures } from './fixtures';

const base = `${appConfig.apiBaseUrl}/__feature_path__`;

/** Mock endpoints for this feature (dev, demo build, tests, stories). */
export const __entity__Handlers = [
  http.get(base, async () => {
    await delay();
    if (consumeFault('__feature__.list')) {
      return HttpResponse.json(
        { title: 'Server error', status: 500 },
        {
          status: 500,
          headers: { 'Content-Type': 'application/problem+json' },
        },
      );
    }
    return HttpResponse.json({ items: __entity__Fixtures });
  }),
];
