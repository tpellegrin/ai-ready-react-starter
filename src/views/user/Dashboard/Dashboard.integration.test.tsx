/** @vitest-environment jsdom */
import { screen } from '@testing-library/react';

import { renderApp } from 'test/app';
import { createFakeAuthAdapter, testUser } from 'test/auth';

describe('Dashboard via the app shell', () => {
  it('renders for a signed-in user without the error fallback', async () => {
    renderApp({ adapter: createFakeAuthAdapter({ user: testUser }) });

    expect(
      await screen.findByRole('heading', { level: 1, name: /^dashboard$/i }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/something went wrong/i)).toBeNull();
  });
});
