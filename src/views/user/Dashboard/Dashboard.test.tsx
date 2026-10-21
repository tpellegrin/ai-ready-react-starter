/** @vitest-environment jsdom */
import { screen } from '@testing-library/react';

import { createFakeAuthAdapter, testUser } from 'test/auth';
import { renderWithProviders } from 'test/utils';

import { Dashboard } from './index';

describe('Dashboard', () => {
  it('greets the signed-in user', async () => {
    renderWithProviders(<Dashboard />, {
      route: '/',
      authAdapter: createFakeAuthAdapter({ user: testUser }),
    });
    expect(
      await screen.findByRole('heading', { level: 1, name: /dashboard/i }),
    ).toBeInTheDocument();
    expect(
      await screen.findByText(`Welcome, ${testUser.name}!`),
    ).toBeInTheDocument();
  });
});
