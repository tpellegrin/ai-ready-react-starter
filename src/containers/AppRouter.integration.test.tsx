/** @vitest-environment jsdom */
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'styled-components';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NavigationProvider } from 'globals/context/NavigationContext';
import { I18nProvider } from 'i18n/provider';
import { base } from 'styles/themes/base';
import { AppRouter } from './AppRouter';
import { AuthProvider } from 'auth/AuthProvider';

// Mock scrollTo since jsdom doesn't implement it
window.HTMLElement.prototype.scrollTo = vi.fn();

const createClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

describe('AppRouter Onboarding Bug Reproduction', () => {
  it('completes onboarding as an authenticated user and reaches Dashboard', async () => {
    const user = userEvent.setup();
    const client = createClient();

    render(
      <QueryClientProvider client={client}>
        <ThemeProvider theme={base}>
          <I18nProvider>
            <AuthProvider>
              <NavigationProvider>
                <div className="app-root">
                  <AppRouter />
                </div>
              </NavigationProvider>
            </AuthProvider>
          </I18nProvider>
        </ThemeProvider>
      </QueryClientProvider>,
    );

    // 1. Start at DemoHub
    expect(await screen.findByTestId('demo-hub-badge')).toBeInTheDocument();

    // 2. Sign In
    const signInLink = screen.getByTestId('demo-hub-link-signIn');
    await user.click(signInLink);
    await user.type(screen.getByPlaceholderText(/email/i), 'demo@example.com');
    await user.type(screen.getByPlaceholderText(/password/i), 'password');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    // 3. Since MOCK_USER now needsOnboarding, we should land on Onboarding Welcome
    expect(await screen.findByText('Step 1 of 3')).toBeInTheDocument();
    expect(screen.getByText('Welcome')).toBeInTheDocument();

    // 4. Go through onboarding
    await user.click(screen.getByRole('button', { name: /continue/i }));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 500));
    });
    expect(await screen.findByText('Step 2 of 3')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /continue/i }));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 500));
    });
    expect(await screen.findByText('Step 3 of 3')).toBeInTheDocument();

    // 5. Click Finish
    const finishButton = screen.getByRole('button', {
      name: /go to dashboard/i,
    });
    await user.click(finishButton);

    // 6. Verify Dashboard is reached and no error is shown
    // Dashboard has a heading "Dashboard"
    expect(
      await screen.findByRole('heading', { level: 1, name: /dashboard/i }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/something went wrong/i)).not.toBeInTheDocument();
  });
});
