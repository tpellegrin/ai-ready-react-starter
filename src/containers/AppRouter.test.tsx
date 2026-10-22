/** @vitest-environment jsdom */
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useLocation } from 'react-router-dom';

import { ApiError } from 'api/http';
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

const OnboardingPage = () => {
  const { completeOnboarding } = useAuth();
  return (
    <main>
      <h1>Onboarding</h1>
      <button type="button" onClick={() => runDetached(completeOnboarding())}>
        Finish
      </button>
    </main>
  );
};

const routes: RouteTable = {
  guest: [
    { path: '/', element: <Page name="Guest home" /> },
    { path: '/sign-in', Component: SignInPage },
  ],
  onboarding: [{ path: '/flow/onboarding/welcome', Component: OnboardingPage }],
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
    adapter.restoreSession.mockRejectedValueOnce(
      new ApiError({ kind: 'network', method: 'GET', url: '/api/session' }),
    );
    renderApp({ routes, adapter });

    expect(await heading("We couldn't check your session")).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(
      "We couldn't reach the server",
    );
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await heading('User home')).toBeInTheDocument();
    expect(adapter.restoreSession).toHaveBeenCalledTimes(2);
  });

  describe('destination behind required onboarding', () => {
    const needsOnboarding = () =>
      createFakeAuthAdapter({ needsOnboarding: true });
    const finishOnboarding = async (
      user: ReturnType<typeof userEvent.setup>,
    ) => {
      expect(await heading('Onboarding')).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Finish' }));
    };

    it('protected deep link with query → sign-in → onboarding → the deep link', async () => {
      const user = userEvent.setup();
      renderApp({
        routes,
        adapter: needsOnboarding(),
        initialPath: '/settings?tab=profile&sort=name',
      });

      await user.click(await screen.findByRole('button', { name: 'Sign in' }));
      await finishOnboarding(user);

      expect(await heading('Settings')).toBeInTheDocument();
      expect(screen.getByTestId('location')).toHaveTextContent(
        '/settings?tab=profile&sort=name',
      );
    });

    it('a restored session that must onboard returns to the page it opened', async () => {
      const user = userEvent.setup();
      renderApp({
        routes,
        adapter: createFakeAuthAdapter({
          user: { ...testUser, needsOnboarding: true },
        }),
        initialPath: '/settings?tab=billing',
      });

      await finishOnboarding(user);

      expect(await heading('Settings')).toBeInTheDocument();
      expect(screen.getByTestId('location')).toHaveTextContent(
        '/settings?tab=billing',
      );
    });

    it.each([
      '/sign-in?returnTo=//evil.example/phish',
      '/sign-in?returnTo=https%3A%2F%2Fevil.example',
      '/sign-in?returnTo=%2Funknown',
      '/sign-in',
    ])(
      'unsafe or missing destinations fall back to home after onboarding (%s)',
      async (initialPath) => {
        const user = userEvent.setup();
        renderApp({ routes, adapter: needsOnboarding(), initialPath });

        await user.click(
          await screen.findByRole('button', { name: 'Sign in' }),
        );
        await finishOnboarding(user);

        expect(await heading('User home')).toBeInTheDocument();
        expect(screen.getByTestId('location')).toHaveTextContent(/^\/$/);
      },
    );

    it('keeps the user on onboarding when completing it fails', async () => {
      const user = userEvent.setup();
      const adapter = needsOnboarding();
      adapter.completeOnboarding.mockRejectedValueOnce(new Error('offline'));
      renderApp({ routes, adapter, initialPath: '/settings' });
      vi.spyOn(console, 'error').mockImplementation(() => undefined);

      await user.click(await screen.findByRole('button', { name: 'Sign in' }));
      await finishOnboarding(user);
      expect(await heading('Onboarding')).toBeInTheDocument();

      // The destination survives the failed attempt.
      await user.click(screen.getByRole('button', { name: 'Finish' }));
      expect(await heading('Settings')).toBeInTheDocument();
    });
  });
});
