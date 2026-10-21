import { act } from '@testing-library/react';
import { vi } from 'vitest';

/**
 * Advance fake timers past route transitions and the flow navigation lock.
 * Use with `vi.useFakeTimers({ shouldAdvanceTime: true })` and
 * `userEvent.setup({ advanceTimers: vi.advanceTimersByTime })`.
 */
export const settleTransitions = () =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(1000);
  });
