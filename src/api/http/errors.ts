import { z } from 'zod';

/**
 * - network: the request never produced a response (offline, DNS, CORS).
 * - aborted: the caller's AbortSignal fired (navigation, query cancellation).
 * - http: the server answered with a non-2xx status (`status`, `body`).
 * - parse: a 2xx body claimed to be JSON but was not.
 * - schema: a 2xx body did not match the request's response schema (`issues`).
 */
export type ApiErrorKind = 'network' | 'aborted' | 'http' | 'parse' | 'schema';

type ApiErrorInit = {
  kind: ApiErrorKind;
  method: string;
  url: string;
  status?: number | undefined;
  body?: unknown;
  issues?: readonly z.core.$ZodIssue[] | undefined;
  cause?: unknown;
};

/**
 * The single error type thrown by the HTTP client. UI code maps it to
 * localized copy with getApiErrorMessageKey (api/http/messages.ts); never
 * render `message` to users.
 */
export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly method: string;
  readonly url: string;
  readonly status: number | undefined;
  /** Parsed JSON error body, or (truncated) text for non-JSON bodies. */
  readonly body: unknown;
  readonly issues: readonly z.core.$ZodIssue[] | undefined;

  constructor({
    kind,
    method,
    url,
    status,
    body,
    issues,
    cause,
  }: ApiErrorInit) {
    super(
      `${method} ${url} failed (${kind}${status === undefined ? '' : ` ${status}`})`,
      { cause },
    );
    this.name = 'ApiError';
    this.kind = kind;
    this.method = method;
    this.url = url;
    this.status = status;
    this.body = body;
    this.issues = issues;
  }
}

export const isApiError = (error: unknown): error is ApiError =>
  error instanceof ApiError;

/**
 * Whether retrying could help: connectivity problems, 408/429 and 5xx.
 * Client errors, validation failures and contract violations never are.
 * TanStack Query owns the retry loop (see api/queryClient.ts).
 */
export const isRetryableError = (error: unknown): boolean => {
  if (!isApiError(error)) return false;
  if (error.kind === 'network') return true;
  if (error.kind !== 'http' || error.status === undefined) return false;
  return error.status === 408 || error.status === 429 || error.status >= 500;
};

/**
 * Validation problem body returned by the reference API with 422:
 * `{ "errors": { "<field>": ["<code>", ...] } }` (RFC 9457-compatible).
 * Codes are stable identifiers the UI maps to i18n keys.
 */
const validationProblemSchema = z.object({
  errors: z.record(z.string(), z.array(z.string())),
});

export type FieldErrors = Record<string, string[]>;

/** Field error codes from a 422 response, or null for any other error. */
export const getFieldErrors = (error: unknown): FieldErrors | null => {
  if (!isApiError(error) || error.kind !== 'http' || error.status !== 422) {
    return null;
  }
  const parsed = validationProblemSchema.safeParse(error.body);
  return parsed.success ? parsed.data.errors : null;
};
