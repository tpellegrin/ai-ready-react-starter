/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, Outlet } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuth } from 'auth/useAuth';
import { I18nProvider } from 'i18n/provider';
import { NavigationProvider } from 'globals/context/NavigationContext';
import { AppRouter } from './AppRouter';
import { base } from 'styles/themes/base';

// Mock useAuth to control auth state in tests
vi.mock('auth/useAuth', () => ({
  useAuth: vi.fn(),
}));

// Minimal mock to avoid router-hook complexities in this smoke test
vi.mock('../components/AnimatedOutlet', () => ({
  AnimatedOutlet: () => (
    <div data-testid="animated-outlet">
      <Outlet />
    </div>
  ),
}));
vi.mock('./Layouts/Shells/CenterTransitionShell', () => ({
  CenterTransitionShell: () => (
    <div data-testid="center-transition-shell">
      <Outlet />
    </div>
  ),
}));

// Mock views to avoid complex rendering
vi.mock('views/guest', () => ({
  GuestRoutes: [
    {
      path: '/',
      Component: () => (
        <div data-testid="guest-view">
          Guest
          <Link
            to="/flow/onboarding/welcome"
            data-testid="guest-link-onboarding"
          >
            Onboarding
          </Link>
        </div>
      ),
    },
    {
      path: '/demo',
      Component: () => <div data-testid="demo-hub-view">Demo</div>,
    },
  ],
}));
vi.mock('views/onboarding', () => ({
  OnboardingRoutes: [
    {
      path: '/flow/onboarding/welcome',
      Component: () => (
        <div data-testid="onboarding-welcome">Onboarding Welcome</div>
      ),
    },
  ],
}));
vi.mock('views/user', () => ({
  UserRoutes: [
    { path: '/', Component: () => <div data-testid="user-view">User</div> },
  ],
}));

const createClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

describe('AppRouter', () => {
  const renderRouter = () => {
    const client = createClient();
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

  it('renders guest routes when unauthenticated', async () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      isInitialized: true,
      user: null,
      signIn: vi.fn(),
      signOut: vi.fn(),
      restoreSession: vi.fn(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    renderRouter();

    expect(await screen.findByTestId('guest-view')).toBeTruthy();
  });

  it('redirects to the first onboarding step when authenticated user needs onboarding', async () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      isInitialized: true,
      user: { id: '1', email: 'test@example.com', needsOnboarding: true },
      signIn: vi.fn(),
      signOut: vi.fn(),
      restoreSession: vi.fn(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    renderRouter();

    // Regression: when entering the onboarding router from `/`, the user
    // must be redirected to the first onboarding step instead of falling
    // through to the wildcard ErrorPage ("Something went wrong").
    expect(await screen.findByTestId('onboarding-welcome')).toBeTruthy();
  });

  it('renders user routes when authenticated and does not need onboarding', async () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      isInitialized: true,
      user: { id: '1', email: 'test@example.com', needsOnboarding: false },
      signIn: vi.fn(),
      signOut: vi.fn(),
      restoreSession: vi.fn(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    renderRouter();

    expect(await screen.findByTestId('user-view')).toBeTruthy();
  });

  it('reaches the onboarding flow when an unauthenticated user follows a link to /flow/onboarding/welcome (DemoHub regression)', async () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      isInitialized: true,
      user: null,
      signIn: vi.fn(),
      signOut: vi.fn(),
      restoreSession: vi.fn(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    renderRouter();
    const link = await screen.findByTestId('guest-link-onboarding');
    await userEvent.click(link);

    // Regression: clicking a link to a flow path while on the guest router
    // must not fall through to the wildcard ErrorPage ("Something went wrong").
    expect(await screen.findByTestId('onboarding-welcome')).toBeTruthy();
  });

  it('renders nothing when not initialized', () => {
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: false,
      isInitialized: false,
      user: null,
      signIn: vi.fn(),
      signOut: vi.fn(),
      restoreSession: vi.fn(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const { container } = renderRouter();
    expect(container.querySelector('.app-root')?.childNodes.length).toBe(0);
  });
});
