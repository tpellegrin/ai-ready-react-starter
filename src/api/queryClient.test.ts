import { ApiError } from './http';
import {
  createQueryClient,
  resetSessionCache,
  shouldRetryQuery,
} from './queryClient';

const error = (kind: 'network' | 'http' | 'schema', status?: number) =>
  new ApiError({ kind, status, method: 'GET', url: 'http://localhost/api/x' });

describe('shouldRetryQuery', () => {
  it('retries transient failures at most twice', () => {
    expect(shouldRetryQuery(0, error('network'))).toBe(true);
    expect(shouldRetryQuery(1, error('http', 503))).toBe(true);
    expect(shouldRetryQuery(2, error('http', 503))).toBe(false);
  });

  it('never retries client errors, contract violations or unknown errors', () => {
    expect(shouldRetryQuery(0, error('http', 404))).toBe(false);
    expect(shouldRetryQuery(0, error('http', 422))).toBe(false);
    expect(shouldRetryQuery(0, error('schema', 200))).toBe(false);
    expect(shouldRetryQuery(0, new Error('bug'))).toBe(false);
  });
});

describe('resetSessionCache', () => {
  it('drops cached data and aborts in-flight query functions', async () => {
    const client = createQueryClient();
    client.setQueryData(['profile'], { name: 'A' });
    let capturedSignal: AbortSignal | undefined;
    const pending = client.fetchQuery({
      queryKey: ['slow'],
      queryFn: ({ signal }) => {
        capturedSignal = signal;
        return new Promise<never>(() => undefined);
      },
    });
    pending.catch(() => undefined);

    resetSessionCache(client);

    expect(client.getQueryData(['profile'])).toBeUndefined();
    expect(client.getQueryCache().getAll()).toHaveLength(0);
    await vi.waitFor(() => expect(capturedSignal?.aborted).toBe(true));
  });
});
