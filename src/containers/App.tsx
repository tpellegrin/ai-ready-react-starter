import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { ThemeProvider } from 'styled-components';

import { resetSessionCache } from 'api/queryClient';
import { AuthProvider } from 'auth/AuthProvider';
import type { AuthAdapter } from 'auth/types';
import { ToastProvider } from 'components/Toast';
import { NavigationProvider } from 'globals/context/NavigationContext';
import { ProgressBarProvider } from 'globals/context/ProgressBar';
import { I18nProvider } from 'i18n/provider';
import { FontStyles } from 'styles/fonts';
import { GlobalStyle } from 'styles/global';
import { base } from 'styles/themes/base';

import { AppRouter } from './AppRouter';
import type { RouteTable, RouterFactory } from './routing/types';

export type AppProps = {
  authAdapter: AuthAdapter;
  queryClient: QueryClient;
  /** Test seams (see src/test/app.tsx); production uses the defaults. */
  routes?: RouteTable | undefined;
  createRouter?: RouterFactory | undefined;
  initialPath?: string | undefined;
};

/**
 * App shell: global providers in dependency order. Dependencies (auth
 * adapter, query client) come from the composition root (main.tsx) so tests
 * and adopted apps can substitute them.
 *
 * Maintainer/AI note: keep the shell generic; feature providers belong in
 * the feature or route that needs them.
 */
export const App = ({
  authAdapter,
  queryClient,
  routes,
  createRouter,
  initialPath,
}: AppProps) => {
  // Session boundary: user-scoped server state never outlives its identity.
  const handleIdentityChange = useCallback(
    () => resetSessionCache(queryClient),
    [queryClient],
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={base}>
        <GlobalStyle />
        <FontStyles />
        <div className="app-root">
          <I18nProvider>
            <ToastProvider>
              <AuthProvider
                adapter={authAdapter}
                onIdentityChange={handleIdentityChange}
              >
                <NavigationProvider>
                  <ProgressBarProvider>
                    <AppRouter
                      routes={routes}
                      createRouter={createRouter}
                      initialPath={initialPath}
                    />
                  </ProgressBarProvider>
                </NavigationProvider>
              </AuthProvider>
            </ToastProvider>
          </I18nProvider>
        </div>
      </ThemeProvider>
    </QueryClientProvider>
  );
};
