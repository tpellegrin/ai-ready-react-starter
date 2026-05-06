/**
 * Shared test utilities for the boilerplate test suite.
 *
 * Maintainer/AI note:
 * These helpers exist to reduce provider duplication across tests, NOT to hide
 * important behavior. Keep them small and explicit. Do not add globals here.
 */
import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from 'auth/AuthProvider';
import { I18nProvider } from 'i18n/provider';
import { NavigationProvider } from 'globals/context/NavigationContext';
import { base } from 'styles/themes/base';

/**
 * QueryClient configured for tests:
 * - retries disabled so failure paths surface immediately
 * - GC turned off to avoid cross-test cache leakage
 */
export const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });

interface ProvidersOptions {
  withRouter?: boolean;
  initialEntries?: string[];
  withAuth?: boolean;
  client?: QueryClient;
}

export const buildProviders = (options: ProvidersOptions = {}) => {
  const {
    withRouter = false,
    initialEntries = ['/'],
    withAuth = true,
    client = createTestQueryClient(),
  } = options;

  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    let tree: React.ReactNode = children;
    if (withAuth) tree = <AuthProvider>{tree}</AuthProvider>;
    tree = <NavigationProvider>{tree}</NavigationProvider>;
    tree = <I18nProvider>{tree}</I18nProvider>;
    if (withRouter) {
      tree = (
        <MemoryRouter initialEntries={initialEntries}>{tree}</MemoryRouter>
      );
    }
    return (
      <QueryClientProvider client={client}>
        <ThemeProvider theme={base}>{tree}</ThemeProvider>
      </QueryClientProvider>
    );
  };

  return { Wrapper, client };
};

export const renderWithProviders = (
  ui: React.ReactElement,
  options: ProvidersOptions & Omit<RenderOptions, 'wrapper'> = {},
) => {
  const { withRouter, initialEntries, withAuth, client, ...rest } = options;
  const { Wrapper, client: usedClient } = buildProviders({
    withRouter,
    initialEntries,
    withAuth,
    client,
  });
  const utils = render(ui, { wrapper: Wrapper, ...rest });
  return { ...utils, client: usedClient };
};

/** Removes any persisted demo auth session. */
export const clearAuthSession = () => {
  localStorage.removeItem('boilerplate_auth_session');
};
