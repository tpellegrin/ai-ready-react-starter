/** @vitest-environment jsdom */
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ApiError } from 'api/http';
import type { User } from 'auth/types';
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
});
