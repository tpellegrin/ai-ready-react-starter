/** @vitest-environment jsdom */
import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ApiError } from 'api/http';
import type { User } from 'auth/types';
import { useAuth } from 'auth/useAuth';
import { createFakeAuthAdapter, testUser } from 'test/auth';
import { renderWithProviders } from 'test/utils';

import { SignIn } from '../index';

const renderSignIn = (adapter = createFakeAuthAdapter()) => {
  const utils = renderWithProviders(<SignIn />, { authAdapter: adapter });
  return { ...utils, adapter };
};

const emailField = () => screen.findByLabelText(/email/i);
const passwordField = () => screen.getByLabelText(/password/i);
const submitButton = () => screen.getByRole('button', { name: /sign in/i });

describe('SignIn view', () => {
  it('labels every field visibly (not placeholder-only)', async () => {
    renderSignIn();
    expect(
      await screen.findByRole('heading', { level: 1, name: /sign in/i }),
    ).toBeInTheDocument();
    expect(await emailField()).toHaveAttribute('type', 'email');
    expect(passwordField()).toHaveAttribute('aria-required', 'true');
  });

  it('validates on submit, links errors to fields and focuses the first invalid one', async () => {
    const user = userEvent.setup();
    const { adapter } = renderSignIn();

    await user.click(submitButton());

    const email = await emailField();
    await waitFor(() => expect(email).toHaveFocus());
    expect(email).toHaveAttribute('aria-invalid', 'true');
    expect(email).toHaveAccessibleDescription('This field is required.');
    expect(passwordField()).toHaveAccessibleDescription(
      'This field is required.',
    );
    expect(adapter.signIn).not.toHaveBeenCalled();
  });

  it('rejects a malformed email before calling the adapter', async () => {
    const user = userEvent.setup();
    const { adapter } = renderSignIn();

    await user.type(await emailField(), 'not-an-email');
    await user.type(passwordField(), 'secret');
    await user.click(submitButton());

    expect(await emailField()).toHaveAccessibleDescription(
      'Enter a valid email address.',
    );
    expect(adapter.signIn).not.toHaveBeenCalled();
  });

  it('shows a pending, non-repeatable submit while signing in', async () => {
    const user = userEvent.setup();
    let resolveSignIn: (value: User) => void = () => undefined;
    const adapter = createFakeAuthAdapter();
    adapter.signIn.mockReturnValueOnce(
      new Promise<User>((resolve) => {
        resolveSignIn = resolve;
      }),
    );
    renderSignIn(adapter);

    await user.type(await emailField(), 'ada@example.com');
    await user.type(passwordField(), 'secret');
    await user.click(submitButton());

    const pending = await screen.findByRole('button', { name: /signing in/i });
    expect(pending).toHaveAttribute('aria-disabled', 'true');
    await user.click(pending);
    expect(adapter.signIn).toHaveBeenCalledTimes(1);

    resolveSignIn(testUser);
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: /signing in/i })).toBeNull(),
    );
  });

  it('announces invalid credentials as a form-level error', async () => {
    const user = userEvent.setup();
    renderSignIn();

    await user.type(await emailField(), 'ada@example.com');
    await user.type(passwordField(), 'wrong');
    await user.click(submitButton());

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Invalid email or password',
    );
    expect(submitButton()).not.toHaveAttribute('aria-disabled');
  });

  it('localizes transport errors from the auth adapter', async () => {
    const user = userEvent.setup();
    const adapter = createFakeAuthAdapter();
    adapter.signIn.mockRejectedValueOnce(
      new ApiError({ kind: 'network', method: 'POST', url: '/api/session' }),
    );
    renderSignIn(adapter);

    await user.type(await emailField(), 'ada@example.com');
    await user.type(passwordField(), 'secret');
    await user.click(submitButton());

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "We couldn't reach the server",
    );
  });

  it('explains a timeout instead of leaving the form pending', async () => {
    const user = userEvent.setup();
    const adapter = createFakeAuthAdapter();
    adapter.signIn.mockRejectedValueOnce(
      new ApiError({ kind: 'timeout', method: 'POST', url: '/api/session' }),
    );
    renderSignIn(adapter);

    await user.type(await emailField(), 'ada@example.com');
    await user.type(passwordField(), 'secret');
    await user.click(submitButton());

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The server took too long to respond',
    );
    expect(submitButton()).not.toHaveAttribute('aria-disabled');
  });

  it('tells a user whose session expired why they are signing in again', async () => {
    const adapter = createFakeAuthAdapter({ user: testUser });
    const { rerenderWithExpiry } = renderExpiring(adapter);

    await rerenderWithExpiry();

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Your session has expired. Sign in again to continue.',
    );
  });

  it('shows no session notice on an ordinary visit', async () => {
    renderSignIn();
    expect(await emailField()).toBeInTheDocument();
    expect(screen.queryByText(/session has expired/)).toBeNull();
  });
});

/**
 * Renders SignIn under a provider whose session then expires (the server
 * answers "no session" to a background check), like after an API 401.
 */
const renderExpiring = (adapter: ReturnType<typeof createFakeAuthAdapter>) => {
  let verify: (() => Promise<void>) | null = null;
  const Expire = () => {
    verify = useAuth().verifySession;
    return null;
  };
  renderWithProviders(
    <>
      <Expire />
      <SignIn />
    </>,
    { authAdapter: adapter },
  );
  return {
    rerenderWithExpiry: async () => {
      await waitFor(() => expect(adapter.restoreSession).toHaveBeenCalled());
      await waitFor(() => expect(verify).not.toBeNull());
      adapter.restoreSession.mockResolvedValueOnce(null);
      await act(async () => {
        await verify?.();
      });
    },
  };
};
