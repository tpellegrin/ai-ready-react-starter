// DEMO: removed with src/demo by `pnpm adopt --remove-demo`.
/** @vitest-environment jsdom */
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { renderApp } from 'test/app';
import { settleTransitions } from 'test/timers';

import { createDemoAuthAdapter } from '../auth/demoAuthAdapter';

window.HTMLElement.prototype.scrollTo = vi.fn();

// Vitest runs with the demo configuration (.env.test), so the default route
// table includes the demo routes (containers/routing/routeTable.ts).
describe('demo routes', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the Starter Overview (DemoHub) at "/" for guests', async () => {
    renderApp();

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: /starter overview/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('demo-hub-badge')).toBeInTheDocument();
    expect(screen.queryByText(/something went wrong/i)).toBeNull();
  });

  it('links to reachable demo routes', async () => {
    renderApp();

    expect(
      await screen.findByTestId('demo-hub-link-signIn'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('demo-hub-link-welcome')).toBeInTheDocument();
    expect(screen.getByTestId('demo-hub-link-dashboard')).toBeInTheDocument();
    expect(screen.getByTestId('demo-hub-link-onboarding')).toBeInTheDocument();
  });

  it('demo sign-in leads through onboarding to the Dashboard', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderApp({ adapter: createDemoAuthAdapter({ latencyMs: 0 }) });

    await user.click(await screen.findByTestId('demo-hub-link-signIn'));
    await user.type(await screen.findByLabelText(/email/i), 'demo@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    for (const step of [1, 2]) {
      expect(await screen.findByText(`Step ${step} of 3`)).toBeInTheDocument();
      await settleTransitions();
      await user.click(screen.getByRole('button', { name: /continue/i }));
    }
    expect(await screen.findByText('Step 3 of 3')).toBeInTheDocument();
    await settleTransitions();
    await user.click(screen.getByRole('button', { name: /go to dashboard/i }));

    expect(
      await screen.findByRole('heading', { level: 1, name: /dashboard/i }),
    ).toBeInTheDocument();
  });

  it('a guest finishing the onboarding preview returns to the start, never to the Dashboard', async () => {
    // Regression: Complete used to call switchRouter(user), mounting the
    // protected user routes for an unauthenticated guest.
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderApp({ adapter: createDemoAuthAdapter({ latencyMs: 0 }) });

    await user.click(await screen.findByTestId('demo-hub-link-onboarding'));
    for (const step of [1, 2]) {
      await screen.findByText(`Step ${step} of 3`);
      await settleTransitions();
      await user.click(screen.getByRole('button', { name: /continue/i }));
    }
    await screen.findByText('Step 3 of 3');
    await settleTransitions();
    await user.click(screen.getByRole('button', { name: /go to dashboard/i }));
    await settleTransitions();

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: /starter overview/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { level: 1, name: /^dashboard$/i }),
    ).not.toBeInTheDocument();
  });
});
