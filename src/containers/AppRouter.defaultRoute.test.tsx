/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { useAuth } from 'auth/useAuth';
import { I18nProvider } from 'i18n/provider';
import { NavigationProvider } from 'globals/context/NavigationContext';
import { AppRouter } from 'containers/AppRouter';
import { base } from 'styles/themes/base';

vi.mock('auth/useAuth', () => ({
  useAuth: vi.fn(),
}));

const renderApp = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <ThemeProvider theme={base}>
        <div className="app-root">
          <I18nProvider>
            <NavigationProvider>
              <AppRouter />
            </NavigationProvider>
          </I18nProvider>
        </div>
      </ThemeProvider>
    </QueryClientProvider>,
  );
};

describe('AppRouter default route', () => {
  it('renders the Starter Overview (DemoHub) at "/" for unauthenticated users', async () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      isInitialized: true,
      user: null,
      signIn: vi.fn(),
      signOut: vi.fn(),
      restoreSession: vi.fn(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    renderApp();

    // Starter Overview heading and badge are visible.
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: /starter overview/i,
      }),
    ).toBeTruthy();
    expect(screen.getByTestId('demo-hub-badge')).toBeTruthy();
    // ErrorPage fallback must NOT be shown.
    expect(screen.queryByText(/something went wrong/i)).toBeNull();
  });

  it('exposes Starter Overview links pointing to reachable demo routes', async () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      isInitialized: true,
      user: null,
      signIn: vi.fn(),
      signOut: vi.fn(),
      restoreSession: vi.fn(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    renderApp();

    expect(await screen.findByTestId('demo-hub-link-signIn')).toBeTruthy();
    expect(screen.getByTestId('demo-hub-link-welcome')).toBeTruthy();
    expect(screen.getByTestId('demo-hub-link-dashboard')).toBeTruthy();
    expect(screen.getByTestId('demo-hub-link-onboarding')).toBeTruthy();
  });
});
