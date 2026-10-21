/** @vitest-environment jsdom */
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { createFakeAuthAdapter, testUser } from 'test/auth';

import { AuthProvider } from './AuthProvider';
import { AuthError, type AuthAdapter, type User } from './types';
import { useAuth } from './useAuth';

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
};

const deferred = <T,>(): Deferred<T> => {
  let resolve: (value: T) => void = () => undefined;
  let reject: (error: unknown) => void = () => undefined;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

/** Exposes the public hook contract as text and buttons. */
const Probe = () => {
  const auth = useAuth();
  const report = (error: unknown) => {
    const node = document.querySelector('[data-testid="last-error"]');
    if (node)
      node.textContent = error instanceof AuthError ? error.code : 'error';
  };
  return (
    <div>
      <p data-testid="status">{auth.status}</p>
      <p data-testid="user">{auth.user?.email ?? 'none'}</p>
      <p data-testid="last-error" />
      <button
        type="button"
        onClick={() => {
          auth
            .signIn({ email: 'ada@example.com', password: 'secret' })
            .catch(report);
        }}
      >
        sign in
      </button>
      <button
        type="button"
        onClick={() => {
          auth
            .signIn({ email: 'ada@example.com', password: 'wrong' })
            .catch(report);
        }}
      >
        sign in wrong
      </button>
      <button
        type="button"
        onClick={() => {
          auth.signOut().catch(report);
        }}
      >
        sign out
      </button>
      <button
        type="button"
        onClick={() => {
          auth.restoreSession().catch(report);
        }}
      >
        retry
      </button>
    </div>
  );
};

const renderProbe = (
  adapter: AuthAdapter,
  onIdentityChange?: (next: User | null, previous: User | null) => void,
) =>
  render(
    <AuthProvider adapter={adapter} onIdentityChange={onIdentityChange}>
      <Probe />
    </AuthProvider>,
  );

const status = () => screen.getByTestId('status');

describe('AuthProvider', () => {
  it('starts initializing, then becomes a guest when there is no session', async () => {
    renderProbe(createFakeAuthAdapter());
    expect(status()).toHaveTextContent('initializing');
    await waitFor(() => expect(status()).toHaveTextContent('unauthenticated'));
  });

  it('restores an existing session', async () => {
    renderProbe(createFakeAuthAdapter({ user: testUser }));
    await waitFor(() => expect(status()).toHaveTextContent('authenticated'));
    expect(screen.getByTestId('user')).toHaveTextContent(testUser.email);
  });

  it('signs in and out through the adapter', async () => {
    const user = userEvent.setup();
    const adapter = createFakeAuthAdapter();
    renderProbe(adapter);
    await waitFor(() => expect(status()).toHaveTextContent('unauthenticated'));

    await user.click(screen.getByRole('button', { name: 'sign in' }));
    await waitFor(() => expect(status()).toHaveTextContent('authenticated'));

    await user.click(screen.getByRole('button', { name: 'sign out' }));
    await waitFor(() => expect(status()).toHaveTextContent('unauthenticated'));
    expect(adapter.signOut).toHaveBeenCalledTimes(1);
  });

  it('rejects invalid credentials to the caller and stays signed out', async () => {
    const user = userEvent.setup();
    renderProbe(createFakeAuthAdapter());
    await waitFor(() => expect(status()).toHaveTextContent('unauthenticated'));

    await user.click(screen.getByRole('button', { name: 'sign in wrong' }));

    expect(await screen.findByText('invalid_credentials')).toBeInTheDocument();
    expect(status()).toHaveTextContent('unauthenticated');
  });

  it('turns a rejected restore into a recoverable error state (no unhandled rejection)', async () => {
    const user = userEvent.setup();
    const adapter = createFakeAuthAdapter({ user: testUser });
    adapter.restoreSession.mockRejectedValueOnce(new Error('offline'));
    renderProbe(adapter);

    await waitFor(() => expect(status()).toHaveTextContent('error'));

    await user.click(screen.getByRole('button', { name: 'retry' }));
    await waitFor(() => expect(status()).toHaveTextContent('authenticated'));
  });

  it('clears the local session even when the adapter fails to sign out', async () => {
    const user = userEvent.setup();
    const adapter = createFakeAuthAdapter({ user: testUser });
    adapter.signOut.mockRejectedValueOnce(new Error('server unavailable'));
    renderProbe(adapter);
    await waitFor(() => expect(status()).toHaveTextContent('authenticated'));

    await user.click(screen.getByRole('button', { name: 'sign out' }));

    await waitFor(() => expect(status()).toHaveTextContent('unauthenticated'));
    expect(screen.getByTestId('last-error')).toHaveTextContent('error');
  });

  it('ignores a restore result that arrives after unmount', async () => {
    const restore = deferred<User | null>();
    const adapter = createFakeAuthAdapter();
    adapter.restoreSession.mockReturnValueOnce(restore.promise);
    const onIdentityChange = vi.fn();
    const { unmount } = renderProbe(adapter, onIdentityChange);

    unmount();
    await act(async () => {
      restore.resolve(testUser);
      await restore.promise;
    });

    expect(onIdentityChange).not.toHaveBeenCalled();
    expect(adapter.restoreSession.mock.calls[0]?.[0].aborted).toBe(true);
  });

  it('ignores late results from a previous adapter after the adapter changes', async () => {
    const lateRestore = deferred<User | null>();
    const first = createFakeAuthAdapter();
    first.restoreSession.mockReturnValueOnce(lateRestore.promise);
    const second = createFakeAuthAdapter();

    const { rerender } = render(
      <AuthProvider adapter={first}>
        <Probe />
      </AuthProvider>,
    );
    rerender(
      <AuthProvider adapter={second}>
        <Probe />
      </AuthProvider>,
    );
    await waitFor(() => expect(status()).toHaveTextContent('unauthenticated'));

    await act(async () => {
      lateRestore.resolve(testUser);
      await lateRestore.promise;
    });

    expect(status()).toHaveTextContent('unauthenticated');
    expect(screen.getByTestId('user')).toHaveTextContent('none');
  });

  it('runs operations in call order (sign-out waits for a pending sign-in)', async () => {
    const user = userEvent.setup();
    const signIn = deferred<User>();
    const adapter = createFakeAuthAdapter();
    adapter.signIn.mockReturnValueOnce(signIn.promise);
    renderProbe(adapter);
    await waitFor(() => expect(status()).toHaveTextContent('unauthenticated'));

    await user.click(screen.getByRole('button', { name: 'sign in' }));
    await user.click(screen.getByRole('button', { name: 'sign out' }));
    expect(adapter.signOut).not.toHaveBeenCalled();

    await act(async () => {
      signIn.resolve(testUser);
      await signIn.promise;
    });

    await waitFor(() => expect(adapter.signOut).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(status()).toHaveTextContent('unauthenticated'));
  });

  it('reports identity changes (sign-in and sign-out) but not a same-user refresh', async () => {
    const user = userEvent.setup();
    const onIdentityChange = vi.fn();
    const adapter = createFakeAuthAdapter({ user: testUser });
    renderProbe(adapter, onIdentityChange);

    await waitFor(() => expect(status()).toHaveTextContent('authenticated'));
    expect(onIdentityChange).toHaveBeenLastCalledWith(testUser, null);

    await user.click(screen.getByRole('button', { name: 'retry' }));
    await waitFor(() => expect(status()).toHaveTextContent('authenticated'));
    expect(onIdentityChange).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: 'sign out' }));
    await waitFor(() => expect(status()).toHaveTextContent('unauthenticated'));
    expect(onIdentityChange).toHaveBeenLastCalledWith(null, testUser);
  });

  it('useAuth throws a clear error outside AuthProvider', () => {
    const Bare = () => {
      useAuth();
      return null;
    };
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => render(<Bare />)).toThrow(
      /useAuth must be used within an AuthProvider/,
    );
    spy.mockRestore();
  });
});
