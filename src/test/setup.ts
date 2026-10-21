import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, vi } from 'vitest';

import { getUnhandledRequest } from 'mocks/frames';
import { resetMockData } from 'mocks/handlers';
import { server } from 'mocks/node';

// jsdom does not implement Pointer Capture; Radix (toast swipe) calls it.
if (
  typeof Element !== 'undefined' &&
  !('hasPointerCapture' in Element.prototype)
) {
  Object.assign(Element.prototype, {
    hasPointerCapture: () => false,
    setPointerCapture: () => undefined,
    releasePointerCapture: () => undefined,
  });
}

/**
 * Every unit test runs against the MSW reference API through the real HTTP
 * client. A request with no matching handler is recorded, answered with a
 * network error, and fails the test that made it.
 */
const unhandledRequests: string[] = [];

beforeAll(() => {
  server.listen({
    onUnhandledFrame({ frame, defaults }) {
      const request = getUnhandledRequest(frame);
      if (!request) return;
      unhandledRequests.push(`${request.method} ${request.url}`);
      defaults.error();
    },
  });
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  resetMockData();
  localStorage.clear();
  sessionStorage.clear();
  vi.clearAllMocks();

  if (unhandledRequests.length) {
    const requests = unhandledRequests.splice(0);
    throw new Error(
      `Unexpected request(s) without an MSW handler:\n  ${requests.join('\n  ')}\nAdd a handler (feature mocks) or server.use(...) in the test.`,
    );
  }
});

afterAll(() => {
  server.close();
});
