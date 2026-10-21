import 'modern-normalize/modern-normalize.css';

import type { Decorator, Preview } from '@storybook/react-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';

import { ToastProvider } from '../src/components/Toast';
import type { Locale } from '../src/i18n';
import { I18nProvider } from '../src/i18n/provider';
import { startMockWorker } from '../src/mocks/browser';
import { resetMockData } from '../src/mocks/handlers';
import { FontStyles } from '../src/styles/fonts';
import { GlobalStyle } from '../src/styles/global';
import { base } from '../src/styles/themes/base';

const LOCALES: Locale[] = ['en-US', 'pt-BR', 'es-ES', 'pseudo'];

const StoryProviders = ({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) => {
  // One cache per story render, so stories never share server state.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      }),
  );
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={base}>
        <GlobalStyle />
        <FontStyles />
        <div className="app-root">
          <I18nProvider key={locale} initialLocale={locale}>
            <ToastProvider>
              <MemoryRouter>
                <main style={{ padding: '1rem' }}>{children}</main>
              </MemoryRouter>
            </ToastProvider>
          </I18nProvider>
        </div>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

/** The app's real providers: theme + global styles, i18n, router, query, toasts. */
const withAppProviders: Decorator = (Story, context) => {
  const locale =
    LOCALES.find((value) => value === context.globals.locale) ?? 'en-US';
  return (
    <StoryProviders locale={locale}>
      <Story />
    </StoryProviders>
  );
};

const preview: Preview = {
  decorators: [withAppProviders],
  // Stories that fetch use the same MSW reference API as the demo build.
  async beforeAll() {
    await startMockWorker();
  },
  beforeEach() {
    resetMockData();
    sessionStorage.clear();
  },
  globalTypes: {
    locale: {
      description: 'Interface language',
      toolbar: {
        title: 'Locale',
        icon: 'globe',
        items: LOCALES,
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { locale: 'en-US' },
  parameters: {
    layout: 'fullscreen',
    a11y: {
      // Include portalled content (dialogs, toasts), not only the story root.
      context: 'body',
      // Automated axe checks fail the story test (CLI/CI) on violations.
      test: 'error',
    },
    controls: { expanded: true },
  },
};

export default preview;
