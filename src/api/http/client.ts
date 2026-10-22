import { z } from 'zod';

import { ApiError } from './errors';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
export type QueryValue = string | number | boolean | null | undefined;

export type HttpRequest<TSchema extends z.ZodType> = {
  method?: HttpMethod | undefined;
  /** Path relative to the client's base URL, e.g. "/resources". */
  path: string;
  /** Appended as query parameters; null/undefined entries are skipped. */
  query?: Record<string, QueryValue | readonly QueryValue[]> | undefined;
  /** Serialized as JSON (sets Content-Type). */
  body?: unknown;
  headers?: HeadersInit | undefined;
  /** Pass TanStack Query's signal so cancellation aborts the request. */
  signal?: AbortSignal | undefined;
  /**
   * Fail with ApiError('timeout') after this many milliseconds (overrides
   * the client's `timeoutMs`). Use a longer value for slow endpoints such
   * as uploads.
   */
  timeoutMs?: number | undefined;
  /**
   * Validates the successful response. The client never trusts a payload's
   * shape: every request names the schema it expects. Use `emptyResponse`
   * for endpoints that return no body (e.g. 204).
   */
  schema: TSchema;
};

export type HttpClient = {
  request<TSchema extends z.ZodType>(
    request: HttpRequest<TSchema>,
  ): Promise<z.output<TSchema>>;
};

export type HttpClientOptions = {
  /** Absolute http(s) URL or root-relative path (resolved against the page origin). */
  baseUrl: string;
  /** Defaults to the global fetch, looked up per request (so test interceptors apply). */
  fetch?: typeof fetch | undefined;
  /** Use 'include' for cookie sessions on a different origin (needs CORS). */
  credentials?: RequestCredentials | undefined;
  /**
   * Extra headers per request, e.g. a CSRF token for unsafe methods
   * (api/csrf.ts) or Authorization from an auth SDK.
   */
  headers?:
    | ((request: { method: HttpMethod; path: string }) => HeadersInit)
    | undefined;
  /**
   * Default request timeout in milliseconds (none when omitted). A timed-out
   * request fails with ApiError('timeout'); the caller's own AbortSignal
   * still produces 'aborted'.
   */
  timeoutMs?: number | undefined;
  /** Origin for root-relative base URLs. Defaults to window.location.origin. */
  origin?: (() => string) | undefined;
};

/** Schema for responses without a body (204, or an empty 200). */
export const emptyResponse = z.undefined();

const MAX_ERROR_TEXT = 2000;

const isJsonContentType = (contentType: string | null) =>
  !!contentType && /^application\/(?:[\w.+-]+\+)?json\b/i.test(contentType);

const isAbortError = (error: unknown) =>
  error instanceof DOMException && error.name === 'AbortError';

const defaultOrigin = () =>
  typeof window === 'undefined' ? 'http://localhost' : window.location.origin;

export const buildUrl = (
  baseUrl: string,
  path: string,
  query: HttpRequest<z.ZodType>['query'],
  origin: string,
): string => {
  if (/^[a-z][a-z\d+.-]*:/i.test(path) || path.startsWith('//')) {
    throw new Error(
      `HTTP client paths must be relative to the base URL (received "${path}").`,
    );
  }
  const base = new URL(baseUrl, origin).toString().replace(/\/+$/, '');
  const url = new URL(`${base}${path.startsWith('/') ? path : `/${path}`}`);
  for (const [key, raw] of Object.entries(query ?? {})) {
    const values: readonly QueryValue[] = Array.isArray(raw) ? raw : [raw];
    for (const value of values) {
      if (value !== null && value !== undefined) {
        url.searchParams.append(key, String(value));
      }
    }
  }
  return url.toString();
};

const parseErrorBody = (text: string, contentType: string | null): unknown => {
  if (text === '') return undefined;
  if (isJsonContentType(contentType)) {
    try {
      return JSON.parse(text) as unknown;
    } catch {
      // Fall through: keep the raw text so diagnostics still have it.
    }
  }
  return text.length > MAX_ERROR_TEXT
    ? `${text.slice(0, MAX_ERROR_TEXT)}…`
    : text;
};

/**
 * Combines the caller's signal with a timeout. `timedOut()` tells the two
 * apart after an abort; `dispose()` clears the timer and listener.
 */
const withTimeout = (
  callerSignal: AbortSignal | undefined,
  timeoutMs: number | undefined,
) => {
  if (timeoutMs === undefined) {
    return { signal: callerSignal, timedOut: () => false, dispose: () => {} };
  }
  const controller = new AbortController();
  const forward = () => controller.abort(callerSignal?.reason);
  if (callerSignal?.aborted) forward();
  else callerSignal?.addEventListener('abort', forward, { once: true });
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  return {
    signal: controller.signal,
    timedOut: () => timedOut,
    dispose: () => {
      clearTimeout(timer);
      callerSignal?.removeEventListener('abort', forward);
    },
  };
};

/**
 * Thin fetch wrapper: base URL handling, JSON bodies, AbortSignal
 * propagation, timeouts, empty-body support, normalized errors (ApiError)
 * and per-request response validation. It does not retry; TanStack Query
 * owns retries for queries, and mutations are not retried automatically.
 */
export const createHttpClient = (options: HttpClientOptions): HttpClient => {
  const fetchImpl: typeof fetch =
    options.fetch ?? ((input, init) => globalThis.fetch(input, init));
  const origin = options.origin ?? defaultOrigin;

  const request = async <TSchema extends z.ZodType>(
    req: HttpRequest<TSchema>,
  ): Promise<z.output<TSchema>> => {
    const method = req.method ?? 'GET';
    const url = buildUrl(options.baseUrl, req.path, req.query, origin());

    const headers = new Headers(options.headers?.({ method, path: req.path }));
    new Headers(req.headers).forEach((value, key) => headers.set(key, value));
    if (!headers.has('Accept')) headers.set('Accept', 'application/json');

    const init: RequestInit = { method, headers };
    if (options.credentials) init.credentials = options.credentials;
    const deadline = withTimeout(
      req.signal,
      req.timeoutMs ?? options.timeoutMs,
    );
    if (deadline.signal) init.signal = deadline.signal;
    if (req.body !== undefined) {
      headers.set('Content-Type', 'application/json');
      init.body = JSON.stringify(req.body);
    }

    const fail = (kind: 'network' | 'aborted' | 'timeout', cause: unknown) =>
      new ApiError({ kind, method, url, cause });

    let response: Response;
    let text: string;
    try {
      response = await fetchImpl(url, init);
      text = await response.text();
    } catch (cause) {
      throw fail(
        deadline.timedOut()
          ? 'timeout'
          : req.signal?.aborted || isAbortError(cause)
            ? 'aborted'
            : 'network',
        cause,
      );
    } finally {
      deadline.dispose();
    }

    const contentType = response.headers.get('Content-Type');
    if (!response.ok) {
      throw new ApiError({
        kind: 'http',
        method,
        url,
        status: response.status,
        body: parseErrorBody(text, contentType),
      });
    }

    let data: unknown = undefined;
    if (text !== '') {
      if (isJsonContentType(contentType)) {
        try {
          data = JSON.parse(text) as unknown;
        } catch (cause) {
          throw new ApiError({
            kind: 'parse',
            method,
            url,
            status: response.status,
            cause,
          });
        }
      } else {
        data = text;
      }
    }

    const parsed = req.schema.safeParse(data);
    if (!parsed.success) {
      throw new ApiError({
        kind: 'schema',
        method,
        url,
        status: response.status,
        issues: parsed.error.issues,
        cause: parsed.error,
      });
    }
    return parsed.data;
  };

  return { request };
};
