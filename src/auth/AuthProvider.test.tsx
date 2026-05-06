/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { AuthProvider, useAuth } from './AuthProvider';

const SESSION_KEY = 'boilerplate_auth_session';

/**
 * Probe component exposing the observable auth surface as roles/text so tests
 * can assert behavior through the public hook contract, not internals.
 */
const AuthProbe = ({ password = 'any' }: { password?: string }) => {
  const { user, isAuthenticated, isInitialized, signIn, signOut } = useAuth();

  return (
    <div>
      <div data-testid="initialized">{String(isInitialized)}</div>
      <div data-testid="status">
        {isAuthenticated ? 'authenticated' : 'guest'}
      </div>
      <div data-testid="user">{user?.email ?? 'none'}</div>
      <div data-testid="error" />
      <button
        type="button"
        onClick={async () => {
          try {
            await signIn({ email: 'demo@example.com', password });
          } catch (e) {
            const node = document.querySelector('[data-testid="error"]');
            if (node) node.textContent = (e as Error).message;
          }
        }}
      >
        sign-in
      </button>
      <button type="button" onClick={() => signOut()}>
        sign-out
      </button>
    </div>
  );
};

const renderProbe = (props: { password?: string } = {}) =>
  render(
    <AuthProvider>
      <AuthProbe {...props} />
    </AuthProvider>,
  );

describe('AuthProvider', () => {
  it('initializes as unauthenticated guest when no session is persisted', async () => {
    renderProbe();

    // Initialization is asynchronous (restoreSession runs once on mount)
    await screen.findByText('true', undefined);
    expect(screen.getByTestId('initialized')).toHaveTextContent('true');
    expect(screen.getByTestId('status')).toHaveTextContent('guest');
    expect(screen.getByTestId('user')).toHaveTextContent('none');
  });

  it('signIn transitions to authenticated state and persists session', async () => {
    const user = userEvent.setup();
    renderProbe();

    await screen.findByText('true');
    await user.click(screen.getByRole('button', { name: 'sign-in' }));

    expect(await screen.findByText('authenticated')).toBeInTheDocument();
    expect(screen.getByTestId('user')).toHaveTextContent('demo@example.com');
    expect(localStorage.getItem(SESSION_KEY)).toBe('true');
  });

  it('signIn surfaces adapter failure and keeps user as guest', async () => {
    const user = userEvent.setup();
    renderProbe({ password: 'fail' });

    await screen.findByText('true');
    await user.click(screen.getByRole('button', { name: 'sign-in' }));

    // Wait for the rejection to be observed by the probe
    expect(await screen.findByText('Invalid credentials')).toBeInTheDocument();
    expect(screen.getByTestId('status')).toHaveTextContent('guest');
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it('signOut returns the user to guest state and clears persistence', async () => {
    const user = userEvent.setup();
    renderProbe();

    await screen.findByText('true');
    await user.click(screen.getByRole('button', { name: 'sign-in' }));
    expect(await screen.findByText('authenticated')).toBeInTheDocument();
    expect(localStorage.getItem(SESSION_KEY)).toBe('true');

    await user.click(screen.getByRole('button', { name: 'sign-out' }));

    expect(await screen.findByText('guest')).toBeInTheDocument();
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it('restores session from persisted storage on mount', async () => {
    localStorage.setItem(SESSION_KEY, 'true');
    renderProbe();

    expect(await screen.findByText('authenticated')).toBeInTheDocument();
    expect(screen.getByTestId('user')).toHaveTextContent('demo@example.com');
  });

  it('useAuth throws a clear error when used outside AuthProvider', () => {
    const Bare = () => {
      useAuth();
      return null;
    };
    // Suppress only the localized error boundary noise from React 19 here.
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => render(<Bare />)).toThrow(
      /useAuth must be used within an AuthProvider/,
    );
    spy.mockRestore();
  });
});
