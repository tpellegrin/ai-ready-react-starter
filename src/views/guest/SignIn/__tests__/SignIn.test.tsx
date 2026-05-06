/** @vitest-environment jsdom */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { ThemeProvider } from 'styled-components';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from 'auth/AuthProvider';
import { I18nProvider } from 'i18n/provider';
import { base } from 'styles/themes/base';
import { SignIn } from '../index';

const createClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } });

const AllProviders: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const client = createClient();
  return (
    <QueryClientProvider client={client}>
      <ThemeProvider theme={base}>
        <I18nProvider>
          <AuthProvider>{children}</AuthProvider>
        </I18nProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

describe('SignIn view', () => {
  it('exposes accessible heading and email/password fields', () => {
    render(<SignIn />, { wrapper: AllProviders });

    expect(
      screen.getByRole('heading', { level: 1, name: /sign in/i }),
    ).toBeInTheDocument();
    // Placeholder is the only visible label here; expose both fields explicitly
    expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/password/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /sign in/i }),
    ).toBeInTheDocument();
  });

  it('disables the submit button while the auth request is in flight', async () => {
    const user = userEvent.setup();
    render(<SignIn />, { wrapper: AllProviders });

    await user.type(screen.getByPlaceholderText(/email/i), 'a@b.c');
    await user.type(screen.getByPlaceholderText(/password/i), 'password');

    const submit = screen.getByRole('button', { name: /sign in/i });
    await user.click(submit);

    // The submitting label is enough to prove the disabled/loading state
    // without coupling to brittle copy: assert it via accessible name + disabled
    const submitting = await screen.findByRole('button', { name: /signing/i });
    expect(submitting).toBeDisabled();

    await waitFor(
      () => {
        expect(
          screen.queryByRole('button', { name: /signing/i }),
        ).not.toBeInTheDocument();
      },
      { timeout: 2000 },
    );

    expect(
      screen.queryByText(/invalid email or password/i),
    ).not.toBeInTheDocument();
  });

  it('shows a localized error when the adapter rejects credentials', async () => {
    const user = userEvent.setup();
    render(<SignIn />, { wrapper: AllProviders });

    await user.type(screen.getByPlaceholderText(/email/i), 'a@b.c');
    // The mock adapter rejects when password === 'fail'
    await user.type(screen.getByPlaceholderText(/password/i), 'fail');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(
      await screen.findByText(/invalid email or password/i),
    ).toBeInTheDocument();
    // After error, the button must be re-enabled and back to its idle name
    const idle = await screen.findByRole('button', { name: /sign in/i });
    expect(idle).toBeEnabled();
  });

  it('does not submit when fields are empty (HTML5 required)', async () => {
    const user = userEvent.setup();
    render(<SignIn />, { wrapper: AllProviders });

    await user.click(screen.getByRole('button', { name: /sign in/i }));

    // Loading state should never appear because submission is blocked.
    expect(
      screen.queryByRole('button', { name: /signing/i }),
    ).not.toBeInTheDocument();
  });
});
