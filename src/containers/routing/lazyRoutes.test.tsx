/** @vitest-environment jsdom */
import { screen } from '@testing-library/react';

import { paths } from 'globals/paths';
import { renderApp, type RouteTable } from 'test/app';
import { createFakeAuthAdapter, testUser } from 'test/auth';

import { routeTable } from './routeTable';

window.HTMLElement.prototype.scrollTo = vi.fn();

const signedIn = () => createFakeAuthAdapter({ user: testUser });

const withLazyUserRoute = (lazy: () => Promise<never>): RouteTable => ({
  guest: [],
  onboarding: [],
  user: [{ path: '/lazy', lazy }],
});

describe('lazy routes', () => {
  it('code-splits the sign-in route (see also pnpm check:build)', () => {
    const signIn = routeTable.guest.find(
      (route) => route.path === paths.signIn,
    );
    expect(signIn?.lazy).toBeTypeOf('function');
    expect(signIn?.Component).toBeUndefined();
  });

  it('renders a lazy route on a deep link (first render)', async () => {
    renderApp({ initialPath: paths.signIn });
    expect(
      await screen.findByRole('heading', { level: 1, name: /sign in/i }),
    ).toBeInTheDocument();
  });

  it('offers a reload when a lazy chunk fails to load (e.g. after a deploy)', async () => {
    renderApp({
      adapter: signedIn(),
      initialPath: '/lazy',
      routes: withLazyUserRoute(() =>
        Promise.reject(
          new TypeError(
            'Failed to fetch dynamically imported module: /assets/index-old.js',
          ),
        ),
      ),
    });
    expect(
      await screen.findByRole('heading', {
        name: 'A newer version is available',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Reload page' }),
    ).toBeInTheDocument();
  });

  it('keeps the generic error page for other route errors', async () => {
    renderApp({
      adapter: signedIn(),
      initialPath: '/lazy',
      routes: withLazyUserRoute(() => Promise.reject(new Error('boom'))),
    });
    expect(
      await screen.findByRole('heading', { name: 'Something went wrong' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reload page' })).toBeNull();
  });
});
