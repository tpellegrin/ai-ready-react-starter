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

describe('Dashboard via AppRouter (regression for "Something went wrong")', () => {
  it('renders Dashboard heading without ErrorBoundary fallback when authenticated and onboarding is complete', async () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      isInitialized: true,
      user: {
        id: '1',
        email: 'demo@example.com',
        name: 'Demo User',
        needsOnboarding: false,
      },
      signIn: vi.fn(),
      signOut: vi.fn(),
      restoreSession: vi.fn(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
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

    // Dashboard heading must render and the ErrorPage fallback must be absent.
    expect(
      await screen.findByRole('heading', { level: 1, name: /^dashboard$/i }),
    ).toBeTruthy();
    expect(screen.queryByText(/something went wrong/i)).toBeNull();
  });
});
