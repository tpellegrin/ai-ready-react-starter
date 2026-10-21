/** @vitest-environment jsdom */
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useLocation } from 'react-router-dom';

import { useAuth } from 'auth/useAuth';
import type { RouteTable } from 'containers/routing/types';
import { renderApp } from 'test/app';
import { createFakeAuthAdapter, testUser } from 'test/auth';
import { runDetached } from 'utils/async';

/** Shows where the router is, so tests can assert the URL. */
const Page = ({ name }: { name: string }) => {
  const { pathname, search } = useLocation();
  return (
    <main>
      <h1>{name}</h1>
      <p data-testid="location">{`${pathname}${search}`}</p>
    </main>
  );
};

const SignInPage = () => {
  const { signIn } = useAuth();
  return (
    <main>
      <h1>Sign in page</h1>
      <button
        type="button"
        onClick={() =>
          runDetached(signIn({ email: 'ada@example.com', password: 'secret' }))
        }
      >
        Sign in
      </button>
    </main>
  );
};

const routes: RouteTable = {
  guest: [
    { path: '/', element: <Page name="Guest home" /> },
    { path: '/sign-in', Component: SignInPage },
  ],
  onboarding: [
    { path: '/flow/onboarding/welcome', element: <Page name="Onboarding" /> },
  ],
  user: [
    { path: '/', element: <Page name="User home" /> },
    { path: '/settings', element: <Page name="Settings" /> },
  ],
};

const heading = (name: string) =>
  screen.findByRole('heading', { level: 1, name });

describe('AppRouter', () => {
  it('renders guest routes when signed out', async () => {
    renderApp({ routes });
    expect(await heading('Guest home')).toBeInTheDocument();
  });

  it('renders user routes when signed in', async () => {
    renderApp({ routes, adapter: createFakeAuthAdapter({ user: testUser }) });
    expect(await heading('User home')).toBeInTheDocument();
  });

  it('redirects to the first onboarding step when the user needs onboarding', async () => {
    renderApp({
      routes,
      adapter: createFakeAuthAdapter({
        user: { ...testUser, needsOnboarding: true },
      }),
    });
    expect(await heading('Onboarding')).toBeInTheDocument();
  });

  it('keeps a deep-linked protected destination across sign-in', async () => {
    const user = userEvent.setup();
    renderApp({ routes, initialPath: '/settings?tab=profile' });

    await user.click(await screen.findByRole('button', { name: 'Sign in' }));

    expect(await heading('Settings')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent(
      '/settings?tab=profile',
    );
  });

  it('sends a signed-in user from a guest-only path to home after sign-in', async () => {
    const user = userEvent.setup();
    renderApp({ routes, initialPath: '/sign-in' });

    await user.click(await screen.findByRole('button', { name: 'Sign in' }));

    expect(await heading('User home')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/$/);
  });

  it.each([
    '/sign-in?returnTo=//evil.example/phish',
    '/sign-in?returnTo=https%3A%2F%2Fevil.example',
    '/sign-in?returnTo=%2Funknown',
  ])('ignores unsafe or unknown returnTo targets (%s)', async (initialPath) => {
    const user = userEvent.setup();
    renderApp({ routes, initialPath });

    await user.click(await screen.findByRole('button', { name: 'Sign in' }));

    expect(await heading('User home')).toBeInTheDocument();
  });

  it('shows Not Found for paths no route group defines', async () => {
    renderApp({ routes, initialPath: '/does-not-exist' });
    expect(await heading('Page not found')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go back home' })).toHaveAttribute(
      'href',
      '/',
    );
  });

  it('announces loading while the session is restored', async () => {
    const adapter = createFakeAuthAdapter();
    let resolveRestore: (user: null) => void = () => undefined;
    adapter.restoreSession.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRestore = resolve;
        }),
    );
    renderApp({ routes, adapter });

    expect(await screen.findByRole('status')).toHaveTextContent('Loading…');
    resolveRestore(null);
    expect(await heading('Guest home')).toBeInTheDocument();
  });

  it('shows a recoverable error when restoring the session fails', async () => {
    const user = userEvent.setup();
    const adapter = createFakeAuthAdapter({ user: testUser });
    adapter.restoreSession.mockRejectedValueOnce(new Error('network down'));
    renderApp({ routes, adapter });

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "We couldn't check your session",
    );
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await heading('User home')).toBeInTheDocument();
    expect(adapter.restoreSession).toHaveBeenCalledTimes(2);
  });
});
