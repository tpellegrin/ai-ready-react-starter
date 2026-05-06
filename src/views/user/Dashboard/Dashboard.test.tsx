/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

import { I18nProvider } from 'i18n/provider';
import { base } from 'styles/themes/base';
import { Dashboard } from './index';

vi.mock('auth/useAuth', () => ({
  useAuth: () => ({
    user: { id: '1', email: 'demo@example.com', name: 'Demo User' },
    isAuthenticated: true,
    isInitialized: true,
    signIn: vi.fn(),
    signOut: vi.fn(),
    restoreSession: vi.fn(),
  }),
}));

const renderDashboard = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <ThemeProvider theme={base}>
        <I18nProvider>
          <MemoryRouter>
            <Dashboard />
          </MemoryRouter>
        </I18nProvider>
      </ThemeProvider>
    </QueryClientProvider>,
  );
};

describe('Dashboard', () => {
  it('renders without throwing when authenticated', () => {
    renderDashboard();
    expect(screen.getByRole('heading', { level: 1 })).toBeTruthy();
  });
});
