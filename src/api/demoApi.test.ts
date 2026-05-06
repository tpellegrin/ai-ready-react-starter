import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fetchAppStatus, type AppStatus } from './demoApi';
import { queryKeys } from './queryKeys';

describe('demoApi.fetchAppStatus', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves with a neutral, boilerplate-shaped AppStatus', async () => {
    const promise = fetchAppStatus();
    // The mock simulates a 1s delay; advancing avoids a real wall-clock wait.
    await vi.advanceTimersByTimeAsync(1000);
    const status: AppStatus = await promise;

    expect(status).toMatchObject({
      status: 'ok',
      version: expect.stringContaining('boilerplate'),
    });
    expect(typeof status.uptime).toBe('number');
    // Sanity: no leakage of product-specific fields
    expect(Object.keys(status).sort()).toEqual(
      ['status', 'uptime', 'version'].sort(),
    );
  });
});

describe('demoApi.queryKeys', () => {
  it('exposes a stable, frozen-shaped key for appStatus', () => {
    expect(queryKeys.appStatus).toEqual(['appStatus']);
    // Stable identity across reads — important for React Query cache
    expect(queryKeys.appStatus).toBe(queryKeys.appStatus);
  });
});
