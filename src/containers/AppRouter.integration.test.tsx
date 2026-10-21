/** @vitest-environment jsdom */
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { paths } from 'globals/paths';
import { renderApp, type RouteTable } from 'test/app';
import { createFakeAuthAdapter } from 'test/auth';
import { settleTransitions } from 'test/timers';
import { GuestRoutes } from 'views/guest';
import { OnboardingRoutes } from 'views/onboarding';
import { UserRoutes } from 'views/user';

window.HTMLElement.prototype.scrollTo = vi.fn();

/** The route table of a non-demo build. */
const routes: RouteTable = {
  guest: GuestRoutes,
  onboarding: OnboardingRoutes,
  user: UserRoutes,
};

describe('Journey: sign in, onboarding, dashboard, sign out', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('takes a new user through onboarding to the Dashboard and back out', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const adapter = createFakeAuthAdapter({ needsOnboarding: true });
    renderApp({ routes, adapter, initialPath: paths.signIn });

    await user.type(await screen.findByLabelText(/email/i), 'new@example.com');
    await user.type(screen.getByLabelText(/password/i), 'secret');
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
    expect(adapter.completeOnboarding).toHaveBeenCalledTimes(1);

    await settleTransitions();
    await user.click(screen.getByRole('button', { name: /sign out/i }));
    await settleTransitions();
    expect(
      await screen.findByRole('button', { name: /get started/i }),
    ).toBeInTheDocument();
    expect(adapter.signOut).toHaveBeenCalledTimes(1);
  });
});
