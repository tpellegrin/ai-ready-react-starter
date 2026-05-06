import { ThemeProvider } from 'styled-components';
import { QueryClientProvider } from '@tanstack/react-query';

import { queryClient } from 'globals/react-query';
import { AuthProvider } from 'auth/AuthProvider';
import { NavigationProvider } from 'globals/context/NavigationContext';
import { ProgressBarProvider } from 'globals/context/ProgressBar';
import { I18nProvider } from 'i18n/provider';
import { AppRouter } from 'containers/AppRouter';
import { base } from 'styles/themes/base';
import { GlobalStyle } from 'styles/global';
import { FontStyles } from 'styles/fonts';

/**
 * Main App entry point that sets up the global application providers.
 *
 * Maintainer/AI note:
 * The order of providers is significant. Ensure that providers which depend on
 * others (e.g., AuthProvider might need I18n) are placed correctly in the stack.
 * Avoid adding feature-specific providers here; keep the shell generic.
 */
export const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider theme={base}>
      <GlobalStyle />
      <FontStyles />
      <div className="app-root">
        <I18nProvider>
          <AuthProvider>
            <NavigationProvider>
              <ProgressBarProvider>
                <AppRouter />
              </ProgressBarProvider>
            </NavigationProvider>
          </AuthProvider>
        </I18nProvider>
      </div>
    </ThemeProvider>
  </QueryClientProvider>
);
