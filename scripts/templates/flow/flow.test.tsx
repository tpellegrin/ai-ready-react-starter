/** @vitest-environment jsdom */
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { paths } from 'globals/paths';
import { renderApp } from 'test/app';
__adapterImport__;
import { settleTransitions } from 'test/timers';

window.HTMLElement.prototype.scrollTo = vi.fn();

/** Behavior the flow contract check cannot see: navigation through the steps. */
describe('__FlowTitle__ flow', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  const heading = (name: string) =>
    screen.findByRole('heading', { level: 1, name });

  it('moves forward and back through its steps', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderApp(__renderOptions__);

    __steps__;
  });
});
