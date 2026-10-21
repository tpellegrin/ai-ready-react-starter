/** @vitest-environment jsdom */
import { useQuery } from '@tanstack/react-query';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { z } from 'zod';

import { apiClient } from 'api/client';
import { useAuth } from 'auth/useAuth';
import type { RouteTable } from 'containers/routing/types';
import { server } from 'mocks/node';
import { renderApp } from 'test/app';
import { createFakeAuthAdapter } from 'test/auth';
import { runDetached } from 'utils/async';

const profileSchema = z.object({ owner: z.string() });

/**
 * User-scoped server state: the kind of data that must not leak. With
 * `forwardSignal: false` the request cannot be aborted (like some SDK calls).
 */
const makeProfile = ({ forwardSignal }: { forwardSignal: boolean }) =>
  function Profile() {
    const { user, signOut } = useAuth();
    const profile = useQuery({
      queryKey: ['profile'],
      // Reading `signal` at all marks it as consumed (TanStack then cancels
      // the query on unmount), so the non-abortable variant never touches it.
      queryFn: forwardSignal
        ? ({ signal }) =>
            apiClient.request({
              path: '/profile',
              schema: profileSchema,
              signal,
            })
        : () => apiClient.request({ path: '/profile', schema: profileSchema }),
    });
    return (
      <main>
        <h1>Signed in as {user?.email}</h1>
        <p data-testid="profile">
          {profile.data ? `profile of ${profile.data.owner}` : 'loading'}
        </p>
        <button type="button" onClick={() => runDetached(signOut())}>
          Sign out
        </button>
      </main>
    );
  };

const GuestPage = () => {
  const { signIn } = useAuth();
  const signInAs = (email: string) =>
    runDetached(signIn({ email, password: 'secret' }));
  return (
    <main>
      <h1>Guest</h1>
      <button type="button" onClick={() => signInAs('a@example.com')}>
        Sign in as A
      </button>
      <button type="button" onClick={() => signInAs('b@example.com')}>
        Sign in as B
      </button>
    </main>
  );
};

const routesWith = (forwardSignal: boolean): RouteTable => ({
  guest: [{ path: '/', Component: GuestPage }],
  onboarding: [],
  user: [{ path: '/', Component: makeProfile({ forwardSignal }) }],
});

describe('Session boundary (query cache isolation)', () => {
  it('does not show user A’s cached data to user B', async () => {
    const user = userEvent.setup();
    let serverUser = 'A';
    server.use(
      http.get('/api/profile', () => HttpResponse.json({ owner: serverUser })),
    );
    renderApp({ routes: routesWith(true), adapter: createFakeAuthAdapter() });

    await user.click(
      await screen.findByRole('button', { name: 'Sign in as A' }),
    );
    expect(await screen.findByText('profile of A')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Sign out' }));
    await screen.findByRole('heading', { name: 'Guest' });

    serverUser = 'B';
    await user.click(screen.getByRole('button', { name: 'Sign in as B' }));

    // A's data is still "fresh" (staleTime) — it must be gone, not reused.
    expect(
      await screen.findByText('Signed in as b@example.com'),
    ).toBeInTheDocument();
    expect(screen.queryByText('profile of A')).not.toBeInTheDocument();
    expect(await screen.findByText('profile of B')).toBeInTheDocument();
  });

  it('drops a late response from A that completes after logout', async () => {
    const user = userEvent.setup();
    let serverUser = 'A';
    let releaseA: () => void = () => undefined;
    const aReleased = new Promise<void>((resolve) => {
      releaseA = resolve;
    });
    let aResponded = false;
    server.use(
      http.get('/api/profile', async () => {
        const owner = serverUser;
        if (owner === 'A') {
          await aReleased; // slow, and not abortable by the client
          aResponded = true;
        }
        return HttpResponse.json({ owner });
      }),
    );
    renderApp({ routes: routesWith(false), adapter: createFakeAuthAdapter() });

    await user.click(
      await screen.findByRole('button', { name: 'Sign in as A' }),
    );
    expect(screen.getByTestId('profile')).toHaveTextContent('loading');

    // A signs out while the request is in flight; its response lands later.
    await user.click(screen.getByRole('button', { name: 'Sign out' }));
    await screen.findByRole('heading', { name: 'Guest' });
    serverUser = 'B';
    releaseA();
    await waitFor(() => expect(aResponded).toBe(true));

    await user.click(screen.getByRole('button', { name: 'Sign in as B' }));

    expect(
      await screen.findByText('Signed in as b@example.com'),
    ).toBeInTheDocument();
    expect(screen.queryByText('profile of A')).not.toBeInTheDocument();
    expect(await screen.findByText('profile of B')).toBeInTheDocument();
  });
});
