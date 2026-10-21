/** @vitest-environment jsdom */
import { screen } from '@testing-library/react';

import type { RouteTable } from 'containers/routing/types';
import { paths } from 'globals/paths';
import { renderApp } from 'test/app';
import { GuestRoutes } from 'views/guest';
import { OnboardingRoutes } from 'views/onboarding';
import { UserRoutes } from 'views/user';

window.HTMLElement.prototype.scrollTo = vi.fn();

/** The route table of a non-demo build (no DemoHub, no public preview). */
const productionRoutes: RouteTable = {
  guest: GuestRoutes,
  onboarding: OnboardingRoutes,
  user: UserRoutes,
};

describe('Protected-route guards', () => {
  it('onboarding is not reachable as a guest (sign-in first)', async () => {
    renderApp({
      routes: productionRoutes,
      initialPath: paths.onboarding.welcome,
    });

    expect(
      await screen.findByRole('heading', { level: 1, name: /sign in/i }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Step 1 of 3')).not.toBeInTheDocument();
  });

  it('the guest start page is Welcome, not the DemoHub', async () => {
    renderApp({ routes: productionRoutes });

    expect(
      await screen.findByRole('button', { name: /get started/i }),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('demo-hub-badge')).not.toBeInTheDocument();
  });
});
