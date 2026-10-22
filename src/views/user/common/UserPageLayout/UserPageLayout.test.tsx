/** @vitest-environment jsdom */
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ApiError } from 'api/http';
import { createFakeAuthAdapter, testUser } from 'test/auth';
import { renderWithProviders } from 'test/utils';

import { UserPageLayout } from './index';

const renderLayout = () => {
  const adapter = createFakeAuthAdapter({ user: testUser });
  renderWithProviders(
    <UserPageLayout title="Page">
      <p>Content</p>
    </UserPageLayout>,
    { route: '/', authAdapter: adapter },
  );
  return adapter;
};

const signOutButton = () => screen.getByRole('button', { name: /sign/i });

describe('UserPageLayout sign-out', () => {
  it('shows progress while the server ends the session', async () => {
    const user = userEvent.setup();
    const adapter = renderLayout();
    let finish: () => void = () => undefined;
    adapter.signOut.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    await screen.findByRole('heading', { level: 1, name: 'Page' });

    await user.click(signOutButton());

    await waitFor(() =>
      expect(signOutButton()).toHaveAccessibleName('Signing out…'),
    );
    expect(signOutButton()).toHaveAttribute('aria-disabled', 'true');
    await user.click(signOutButton());
    finish();
    await waitFor(() => expect(adapter.signOut).toHaveBeenCalledTimes(1));
  });

  it('explains a failed sign-out and lets the user try again', async () => {
    const user = userEvent.setup();
    const adapter = renderLayout();
    adapter.signOut.mockRejectedValueOnce(
      new ApiError({ kind: 'network', method: 'DELETE', url: '/api/session' }),
    );
    await screen.findByRole('heading', { level: 1, name: 'Page' });

    await user.click(signOutButton());

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "We couldn't sign you out",
    );
    expect(signOutButton()).toHaveAccessibleName('Sign out');

    await user.click(signOutButton());
    await waitFor(() => expect(adapter.signOut).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
  });
});
