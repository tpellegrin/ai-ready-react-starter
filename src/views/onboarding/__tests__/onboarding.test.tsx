/** @vitest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ThemeProvider } from 'styled-components';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NavigationProvider } from 'globals/context/NavigationContext';
import type { ReactElement } from 'react';
import {
  LayoutChromeContext,
  LayoutChromeOwnerToken,
  LayoutChromePayload,
} from 'containers/Layouts/common/LayoutChromeContext';
import { I18nProvider } from 'i18n/provider';
import { AuthProvider } from 'auth/AuthProvider';
import { base } from 'styles/themes/base';
import { Welcome } from '../Welcome';
import { Preferences } from '../Preferences';
import { Complete } from '../Complete';

// Suppress FlowLayout dev warnings about missing .app-root and scroll viewport in jsdom
vi.spyOn(console, 'warn').mockImplementation(() => {});

const createClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } });

/**
 * Minimal chrome-rendering shell for tests.
 *
 * FlowLayout publishes header and footer into LayoutChromeContext so that
 * CenterTransitionShell can render them outside the animated center area.
 * In tests there is no shell, so we provide a minimal context that renders
 * the published chrome directly into the DOM — enabling button and heading
 * queries to work as expected.
 */
const TestChromeShell: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [headerNode, setHeaderNode] = React.useState<ReactElement | null>(null);
  const [footerNode, setFooterNode] = React.useState<ReactElement | null>(null);

  const registryRef = React.useRef<
    Map<LayoutChromeOwnerToken, { payload: LayoutChromePayload; order: number }>
  >(new Map());
  const orderRef = React.useRef(0);

  const resolve = React.useCallback(() => {
    let active: { payload: LayoutChromePayload; order: number } | null = null;
    for (const entry of registryRef.current.values()) {
      if (!active || entry.order > active.order) active = entry;
    }
    const h = active?.payload.header;
    setHeaderNode(React.isValidElement(h) ? h : null);
    const f = active?.payload.footer;
    setFooterNode(React.isValidElement(f) ? f : null);
  }, []);

  const registerChrome = React.useCallback(
    (owner: LayoutChromeOwnerToken, payload: LayoutChromePayload) => {
      orderRef.current += 1;
      registryRef.current.set(owner, { payload, order: orderRef.current });
      resolve();
    },
    [resolve],
  );

  const unregisterChrome = React.useCallback(
    (owner: LayoutChromeOwnerToken) => {
      registryRef.current.delete(owner);
      resolve();
    },
    [resolve],
  );

  return (
    <LayoutChromeContext.Provider value={{ registerChrome, unregisterChrome }}>
      {headerNode}
      {children}
      {footerNode}
    </LayoutChromeContext.Provider>
  );
};

/**
 * Full wrapper for flow screen tests.
 * MemoryRouter is initialized at the given path so useFlowProgressFromPaths
 * can parse the step position from the URL.
 */
const makeWrapper =
  (initialPath: string) =>
  ({ children }: { children: React.ReactNode }) => {
    const client = createClient();
    return (
      <QueryClientProvider client={client}>
        <ThemeProvider theme={base}>
          <I18nProvider>
            <AuthProvider>
              <NavigationProvider>
                <MemoryRouter initialEntries={[initialPath]}>
                  <TestChromeShell>{children}</TestChromeShell>
                </MemoryRouter>
              </NavigationProvider>
            </AuthProvider>
          </I18nProvider>
        </ThemeProvider>
      </QueryClientProvider>
    );
  };

// ─────────────────────────────────────────────────────────────────────────────
// Welcome screen
// ─────────────────────────────────────────────────────────────────────────────

describe('Onboarding: Welcome screen', () => {
  const wrapper = makeWrapper('/flow/onboarding/welcome');

  it('renders an accessible h1 heading', () => {
    render(<Welcome />, { wrapper });
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('renders a Continue button', () => {
    render(<Welcome />, { wrapper });
    expect(
      screen.getByRole('button', { name: /continue/i }),
    ).toBeInTheDocument();
  });

  it('does not render a Back button on the first step', () => {
    render(<Welcome />, { wrapper });
    expect(screen.queryByRole('button', { name: /go back/i })).toBeNull();
  });

  it('i18n copy renders the welcome title', () => {
    render(<Welcome />, { wrapper });
    expect(screen.getByText('Welcome')).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Preferences screen
// ─────────────────────────────────────────────────────────────────────────────

describe('Onboarding: Preferences screen', () => {
  const wrapper = makeWrapper('/flow/onboarding/preferences');

  it('renders an accessible h1 heading', () => {
    render(<Preferences />, { wrapper });
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('renders a Continue button', () => {
    render(<Preferences />, { wrapper });
    expect(
      screen.getByRole('button', { name: /continue/i }),
    ).toBeInTheDocument();
  });

  it('renders a Back button on a middle step', () => {
    render(<Preferences />, { wrapper });
    expect(
      screen.getByRole('button', { name: /go back/i }),
    ).toBeInTheDocument();
  });

  it('i18n copy renders the preferences title', () => {
    render(<Preferences />, { wrapper });
    expect(screen.getByText('Your Preferences')).toBeInTheDocument();
  });

  it('Back and Continue buttons are enabled and clickable on a middle step', async () => {
    const user = userEvent.setup();
    render(<Preferences />, { wrapper });

    const back = screen.getByRole('button', { name: /go back/i });
    const next = screen.getByRole('button', { name: /continue/i });

    expect(back).toBeEnabled();
    expect(next).toBeEnabled();

    // Smoke: clicking neither throws nor unmounts the screen
    await user.click(back);
    await user.click(next);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Complete screen
// ─────────────────────────────────────────────────────────────────────────────

describe('Onboarding: Complete screen', () => {
  const wrapper = makeWrapper('/flow/onboarding/complete');

  it('renders an accessible h1 heading', () => {
    render(<Complete />, { wrapper });
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('renders the finish CTA button', () => {
    render(<Complete />, { wrapper });
    expect(
      screen.getByRole('button', { name: /go to dashboard/i }),
    ).toBeInTheDocument();
  });

  it('renders a Back button on the last step', () => {
    render(<Complete />, { wrapper });
    expect(
      screen.getByRole('button', { name: /go back/i }),
    ).toBeInTheDocument();
  });

  it('i18n copy renders the complete title', () => {
    render(<Complete />, { wrapper });
    expect(screen.getByText('You are all set')).toBeInTheDocument();
  });

  it('finish button is enabled and remains accessible after click', async () => {
    const user = userEvent.setup();
    render(<Complete />, { wrapper });

    const cta = screen.getByRole('button', { name: /go to dashboard/i });
    expect(cta).toBeEnabled();
    await user.click(cta);
    // The screen must still expose its accessible heading after click
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });
});
