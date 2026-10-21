import { builtinEnvironments, type Environment } from 'vitest/environments';

/**
 * jsdom, but with Node's fetch-family globals.
 *
 * Vitest's jsdom environment replaces `AbortController`/`AbortSignal` (and a few
 * stream/encoding globals) with jsdom's implementations while `fetch`, `Request`
 * and `Response` stay Node's (undici). Since Node 24, undici rejects foreign
 * signals ("Expected signal to be an instance of AbortSignal"), which breaks
 * React Router data routers and any `fetch(url, { signal })` in tests.
 *
 * Restoring Node's versions keeps one consistent implementation, mirroring what
 * the browser provides. DOM APIs (document, events, elements) remain jsdom's.
 */
const NODE_FETCH_GLOBALS = [
  'fetch',
  'Request',
  'Response',
  'Headers',
  'FormData',
  'Blob',
  'File',
  'AbortController',
  'AbortSignal',
  'ReadableStream',
  'WritableStream',
  'TransformStream',
  'TextEncoder',
  'TextDecoder',
  'BroadcastChannel',
  'structuredClone',
  'URL',
  'URLSearchParams',
] as const;

const environment: Environment = {
  name: 'jsdom-node-fetch',
  viteEnvironment: 'client',
  async setup(global: Record<string, unknown>, options) {
    const nodeGlobals = NODE_FETCH_GLOBALS.map(
      (key) => [key, global[key]] as const,
    );
    const jsdom = await builtinEnvironments.jsdom.setup(global, options);

    for (const [key, value] of nodeGlobals) {
      if (value === undefined) continue;
      Object.defineProperty(global, key, {
        value,
        configurable: true,
        writable: true,
      });
    }

    return jsdom;
  },
};

export default environment;
