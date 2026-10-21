/**
 * Shared test utilities.
 *
 * Maintainer/AI note:
 * These helpers reduce provider duplication; they must not hide behavior.
 * Keep them small and explicit. For whole-app tests use renderApp
 * (src/test/app.tsx); for a component, renderWithProviders.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderOptions } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';

import { queryClientDefaults } from 'api/queryClient';
import { AuthProvider } from 'auth/AuthProvider';
import type { AuthAdapter } from 'auth/types';
import { ToastProvider } from 'components/Toast';
import { NavigationProvider } from 'globals/context/NavigationContext';
import { I18nProvider } from 'i18n/provider';
import { base } from 'styles/themes/base';

/**
 * QueryClient for tests: app defaults, but no retries (failures surface
 * immediately) and no garbage-collection timers. Create one per test.
 */
export const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        ...queryClientDefaults.queries,
        retry: false,
        gcTime: Infinity,
      },
      mutations: { ...queryClientDefaults.mutations, retry: false },
    },
  });

type ProvidersOptions = {
  /** Wrap in a MemoryRouter starting at this path. */
  route?: string | undefined;
  /** Wrap in an AuthProvider using this adapter. */
  authAdapter?: AuthAdapter | undefined;
  client?: QueryClient | undefined;
};

export const renderWithProviders = (
  ui: ReactElement,
  {
    route,
    authAdapter,
    client = createTestQueryClient(),
    ...renderOptions
  }: ProvidersOptions & Omit<RenderOptions, 'wrapper'> = {},
) => {
  const Wrapper = ({ children }: { children: ReactNode }) => {
    let tree: ReactNode = <NavigationProvider>{children}</NavigationProvider>;
    if (authAdapter) {
      tree = <AuthProvider adapter={authAdapter}>{tree}</AuthProvider>;
    }
    if (route !== undefined) {
      tree = <MemoryRouter initialEntries={[route]}>{tree}</MemoryRouter>;
    }
    return (
      <QueryClientProvider client={client}>
        <ThemeProvider theme={base}>
          <I18nProvider>
            <ToastProvider>{tree}</ToastProvider>
          </I18nProvider>
        </ThemeProvider>
      </QueryClientProvider>
    );
  };

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    client,
  };
};
