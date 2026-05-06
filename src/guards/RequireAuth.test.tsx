/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

import { AuthProvider } from 'auth/AuthProvider';
import { I18nProvider } from 'i18n/provider';
import RequireAuth from './RequireAuth';
import { base } from 'styles/themes/base';

const createClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

const Protected = () => <div>Protected Content</div>;

describe('RequireAuth', () => {
  it('redirects unauthenticated users to sign-in', async () => {
    const client = createClient();
    render(
      <QueryClientProvider client={client}>
        <ThemeProvider theme={base}>
          <I18nProvider>
            <AuthProvider>
              <MemoryRouter initialEntries={['/protected']}>
                <Routes>
                  <Route
                    path="/protected"
                    element={
                      <RequireAuth>
                        <Protected />
                      </RequireAuth>
                    }
                  />
                  <Route path="/sign-in" element={<div>Sign In Page</div>} />
                </Routes>
              </MemoryRouter>
            </AuthProvider>
          </I18nProvider>
        </ThemeProvider>
      </QueryClientProvider>,
    );

    // Should wait for AuthProvider to initialize and RequireAuth to redirect
    expect(await screen.findByText('Sign In Page')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).toBeNull();
  });

  it('renders children when authenticated (restored session)', async () => {
    localStorage.setItem('boilerplate_auth_session', 'true');
    const client = createClient();
    render(
      <QueryClientProvider client={client}>
        <ThemeProvider theme={base}>
          <I18nProvider>
            <AuthProvider>
              <MemoryRouter>
                <RequireAuth>
                  <Protected />
                </RequireAuth>
              </MemoryRouter>
            </AuthProvider>
          </I18nProvider>
        </ThemeProvider>
      </QueryClientProvider>,
    );

    expect(await screen.findByText('Protected Content')).toBeInTheDocument();
  });
});
