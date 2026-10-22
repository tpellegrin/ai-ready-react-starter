/** @vitest-environment jsdom */
import { useQuery } from '@tanstack/react-query';
import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { useLocation } from 'react-router-dom';
import { z } from 'zod';

import { apiClient } from 'api/client';
import { getErrorMessageKey } from 'api/http';
import { useAuth } from 'auth/useAuth';
import { appConfig } from 'config';
import type { RouteTable } from 'containers/routing/types';
import { useI18n } from 'i18n/provider';
import { server } from 'mocks/node';
import { renderApp } from 'test/app';
import { createFakeAuthAdapter, testUser } from 'test/auth';

const endpoint = `${appConfig.apiBaseUrl}/reports`;

/** A signed-in page whose data comes from the API through a query. */
const Reports = () => {
  const { t } = useI18n();
  const reports = useQuery({
    queryKey: ['reports'],
    queryFn: ({ signal }) =>
      apiClient.request({ path: '/reports', schema: z.object({}), signal }),
  });
  return (
    <main>
      <h1>Reports</h1>
      {reports.isError ? (
        <p role="alert">{t(getErrorMessageKey(reports.error))}</p>
      ) : null}
    </main>
  );
};

const SignInPage = () => {
  const { sessionEndReason } = useAuth();
  const { search } = useLocation();
  return (
    <main>
      <h1>Sign in</h1>
      <p data-testid="reason">{sessionEndReason ?? 'none'}</p>
      <p data-testid="search">{search}</p>
    </main>
  );
};

const routes: RouteTable = {
  guest: [{ path: '/sign-in', Component: SignInPage }],
  onboarding: [],
  user: [{ path: '/reports', Component: Reports }],
};

const answer = (status: number) =>
  server.use(
    http.get(endpoint, () =>
      HttpResponse.json({ title: 'x', status }, { status }),
    ),
  );

const signedIn = () => createFakeAuthAdapter({ user: testUser });

describe('SessionMonitor (API 401 → session check)', () => {
  it('ends an expired session and sends the user to sign in for the same page', async () => {
    answer(401);
    const adapter = signedIn();
    adapter.restoreSession
      .mockResolvedValueOnce(testUser) // startup
      .mockResolvedValueOnce(null); // the check after the 401
    renderApp({ routes, adapter, initialPath: '/reports?range=week' });

    expect(
      await screen.findByRole('heading', { name: 'Sign in' }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('reason')).toHaveTextContent('expired');
    expect(screen.getByTestId('search')).toHaveTextContent(
      `?returnTo=${encodeURIComponent('/reports?range=week')}`,
    );
  });

  it('keeps a valid session: the endpoint’s 401 is shown in place', async () => {
    answer(401);
    const adapter = signedIn();
    renderApp({ routes, adapter, initialPath: '/reports' });

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The server did not accept your sign-in for this request',
    );
    await waitFor(() =>
      expect(adapter.restoreSession).toHaveBeenCalledTimes(2),
    );
    expect(
      screen.getByRole('heading', { name: 'Reports' }),
    ).toBeInTheDocument();
  });

  it('keeps the session when the check itself fails (offline)', async () => {
    answer(401);
    const adapter = signedIn();
    adapter.restoreSession
      .mockResolvedValueOnce(testUser)
      .mockRejectedValueOnce(new Error('offline'));
    renderApp({ routes, adapter, initialPath: '/reports' });

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    await waitFor(() =>
      expect(adapter.restoreSession).toHaveBeenCalledTimes(2),
    );
    expect(
      screen.getByRole('heading', { name: 'Reports' }),
    ).toBeInTheDocument();
  });

  it.each([403, 404, 500])(
    'never checks or ends the session for a %i',
    async (status) => {
      answer(status);
      const adapter = signedIn();
      renderApp({ routes, adapter, initialPath: '/reports' });

      expect(await screen.findByRole('alert')).toBeInTheDocument();
      expect(adapter.restoreSession).toHaveBeenCalledTimes(1);
    },
  );
});
