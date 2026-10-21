import { delay, http, HttpResponse } from 'msw';
import { z } from 'zod';

import { server } from 'mocks/node';

import { buildUrl, createHttpClient, emptyResponse } from './client';
import { ApiError, getFieldErrors, isRetryableError } from './errors';

const ORIGIN = window.location.origin;
const client = createHttpClient({ baseUrl: '/api' });
const itemSchema = z.object({ id: z.string(), name: z.string() });

/** Resolve with the error a promise rejects with (fails if it resolves). */
const rejectionOf = async (promise: Promise<unknown>): Promise<ApiError> => {
  try {
    await promise;
  } catch (error) {
    if (error instanceof ApiError) return error;
    throw error;
  }
  throw new Error('Expected the request to fail');
};

describe('buildUrl', () => {
  it('joins root-relative and absolute bases without double slashes', () => {
    expect(buildUrl('/api/', '/items', undefined, ORIGIN)).toBe(
      `${ORIGIN}/api/items`,
    );
    expect(
      buildUrl('https://api.example.com/v1', 'items', undefined, ORIGIN),
    ).toBe('https://api.example.com/v1/items');
  });

  it('serializes query parameters and skips empty ones', () => {
    expect(
      buildUrl(
        '/api',
        '/items',
        { q: 'a b', page: 2, tag: ['x', 'y'], skip: undefined, none: null },
        ORIGIN,
      ),
    ).toBe(`${ORIGIN}/api/items?q=a+b&page=2&tag=x&tag=y`);
  });

  it.each(['https://evil.example/x', '//evil.example/x'])(
    'refuses absolute request paths (%s) so credentials never leave the API origin',
    (path) => {
      expect(() => buildUrl('/api', path, undefined, ORIGIN)).toThrow(
        /relative/,
      );
    },
  );
});

describe('createHttpClient', () => {
  it('validates and returns a JSON payload', async () => {
    server.use(
      http.get('/api/items/1', () =>
        HttpResponse.json({ id: '1', name: 'One' }),
      ),
    );
    await expect(
      client.request({ path: '/items/1', schema: itemSchema }),
    ).resolves.toEqual({
      id: '1',
      name: 'One',
    });
  });

  it('sends JSON bodies and default/custom headers', async () => {
    let seen: {
      body: unknown;
      contentType: string | null;
      accept: string | null;
      custom: string | null;
    } | null = null;
    server.use(
      http.post('/api/items', async ({ request }) => {
        seen = {
          body: await request.json(),
          contentType: request.headers.get('content-type'),
          accept: request.headers.get('accept'),
          custom: request.headers.get('x-trace'),
        };
        return HttpResponse.json({ id: '2', name: 'Two' }, { status: 201 });
      }),
    );
    const withHeaders = createHttpClient({
      baseUrl: '/api',
      headers: () => ({ 'X-Trace': 'abc' }),
    });

    await withHeaders.request({
      method: 'POST',
      path: '/items',
      body: { name: 'Two' },
      schema: itemSchema,
    });

    expect(seen).toEqual({
      body: { name: 'Two' },
      contentType: 'application/json',
      accept: 'application/json',
      custom: 'abc',
    });
  });

  it('accepts empty responses (204) with emptyResponse', async () => {
    server.use(
      http.delete(
        '/api/items/1',
        () => new HttpResponse(null, { status: 204 }),
      ),
    );
    await expect(
      client.request({
        method: 'DELETE',
        path: '/items/1',
        schema: emptyResponse,
      }),
    ).resolves.toBeUndefined();
  });

  it('reports an empty body as a schema error when data was expected', async () => {
    server.use(
      http.get('/api/items/1', () => new HttpResponse(null, { status: 200 })),
    );
    const error = await rejectionOf(
      client.request({ path: '/items/1', schema: itemSchema }),
    );
    expect(error.kind).toBe('schema');
  });

  it('rejects payloads that do not match the response schema (malformed data)', async () => {
    server.use(
      http.get('/api/items/1', () =>
        HttpResponse.json({ id: 1, title: 'wrong shape' }),
      ),
    );
    const error = await rejectionOf(
      client.request({ path: '/items/1', schema: itemSchema }),
    );
    expect(error.kind).toBe('schema');
    expect(error.status).toBe(200);
    expect(error.issues?.map((issue) => issue.path.join('.'))).toEqual([
      'id',
      'name',
    ]);
    expect(isRetryableError(error)).toBe(false);
  });

  it('reports invalid JSON in a successful response as a parse error', async () => {
    server.use(
      http.get(
        '/api/items/1',
        () =>
          new HttpResponse('{"id": ', {
            headers: { 'Content-Type': 'application/json' },
          }),
      ),
    );
    const error = await rejectionOf(
      client.request({ path: '/items/1', schema: itemSchema }),
    );
    expect(error.kind).toBe('parse');
  });

  it('normalizes HTTP errors with a parsed JSON body', async () => {
    server.use(
      http.post('/api/items', () =>
        HttpResponse.json({ errors: { name: ['taken'] } }, { status: 422 }),
      ),
    );
    const error = await rejectionOf(
      client.request({
        method: 'POST',
        path: '/items',
        body: { name: 'x' },
        schema: itemSchema,
      }),
    );
    expect(error).toMatchObject({ kind: 'http', status: 422, method: 'POST' });
    expect(getFieldErrors(error)).toEqual({ name: ['taken'] });
    expect(isRetryableError(error)).toBe(false);
  });

  it('handles non-JSON error bodies (e.g. an HTML 502 page) without throwing a parse error', async () => {
    server.use(
      http.get(
        '/api/items',
        () =>
          new HttpResponse('<html><body>Bad gateway</body></html>', {
            status: 502,
            headers: { 'Content-Type': 'text/html' },
          }),
      ),
    );
    const error = await rejectionOf(
      client.request({ path: '/items', schema: z.array(itemSchema) }),
    );
    expect(error).toMatchObject({ kind: 'http', status: 502 });
    expect(error.body).toBe('<html><body>Bad gateway</body></html>');
    expect(getFieldErrors(error)).toBeNull();
    expect(isRetryableError(error)).toBe(true);
  });

  it('reports connectivity failures as retryable network errors', async () => {
    server.use(http.get('/api/items', () => HttpResponse.error()));
    const error = await rejectionOf(
      client.request({ path: '/items', schema: z.array(itemSchema) }),
    );
    expect(error.kind).toBe('network');
    expect(isRetryableError(error)).toBe(true);
  });

  it('propagates AbortSignal cancellation as an "aborted" error', async () => {
    server.use(
      http.get('/api/items', async () => {
        await delay('infinite');
        return HttpResponse.json([]);
      }),
    );
    const controller = new AbortController();
    const pending = client.request({
      path: '/items',
      schema: z.array(itemSchema),
      signal: controller.signal,
    });
    controller.abort();
    const error = await rejectionOf(pending);
    expect(error.kind).toBe('aborted');
    expect(isRetryableError(error)).toBe(false);
  });

  it('passes credentials mode through for cross-origin cookie sessions', async () => {
    const fetchSpy = vi.fn<typeof fetch>(() =>
      Promise.resolve(Response.json({ id: '1', name: 'One' })),
    );
    const withCookies = createHttpClient({
      baseUrl: '/api',
      credentials: 'include',
      fetch: fetchSpy,
    });
    await withCookies.request({ path: '/items/1', schema: itemSchema });
    expect(fetchSpy.mock.calls[0]?.[1]?.credentials).toBe('include');
  });
});
