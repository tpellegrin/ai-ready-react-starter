/** @vitest-environment jsdom */
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrictMode } from 'react';

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

/** A call that never settles (a hung request). */
const never = <T,>() => new Promise<T>(() => undefined);

/** Exposes the public hook contract as text and buttons. */
const Probe = () => {
  const auth = useAuth();
  const report = (error: unknown) => {
    const node = document.querySelector('[data-testid="last-error"]');
    if (node)
      node.textContent = error instanceof AuthError ? error.code : 'error';
  };
  const actions: Array<[string, () => Promise<void>]> = [
    [
      'sign in',
      () => auth.signIn({ email: 'ada@example.com', password: 'secret' }),
    ],
    [
      'sign in wrong',
      () => auth.signIn({ email: 'ada@example.com', password: 'wrong' }),
    ],
    ['sign out', () => auth.signOut()],
    ['retry', () => auth.restoreSession()],
    ['verify', () => auth.verifySession()],
    ['complete onboarding', () => auth.completeOnboarding()],
  ];
  return (
    <div>
      <p data-testid="status">{auth.status}</p>
      <p data-testid="user">{auth.user?.email ?? 'none'}</p>
      <p data-testid="ended">{auth.sessionEndReason ?? 'none'}</p>
      <p data-testid="last-error" />
      {actions.map(([label, run]) => (
        <button
          key={label}
          type="button"
          onClick={() => {
            run().catch(report);
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
};

const renderProbe = (
  adapter: AuthAdapter,
  {
    onIdentityChange,
    operationTimeoutMs,
    strict = false,
  }: {
    onIdentityChange?: (next: User | null, previous: User | null) => void;
    operationTimeoutMs?: number;
    strict?: boolean;
  } = {},
) => {
  const tree = (current: AuthAdapter) => {
    const provider = (
      <AuthProvider
        adapter={current}
        onIdentityChange={onIdentityChange}
        operationTimeoutMs={operationTimeoutMs}
      >
        <Probe />
      </AuthProvider>
    );
    return strict ? <StrictMode>{provider}</StrictMode> : provider;
  };
  const utils = render(tree(adapter));
  return {
    ...utils,
    replaceAdapter: (next: AuthAdapter) => utils.rerender(tree(next)),
  };
};

const status = () => screen.getByTestId('status');
const click = (user: ReturnType<typeof userEvent.setup>, name: string) =>
  user.click(screen.getByRole('button', { name }));

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

    await click(user, 'sign in');
    await waitFor(() => expect(status()).toHaveTextContent('authenticated'));

    await click(user, 'sign out');
    await waitFor(() => expect(status()).toHaveTextContent('unauthenticated'));
    expect(adapter.signOut).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('ended')).toHaveTextContent('signedOut');
  });

  it('rejects invalid credentials to the caller and stays signed out', async () => {
    const user = userEvent.setup();
    renderProbe(createFakeAuthAdapter());
    await waitFor(() => expect(status()).toHaveTextContent('unauthenticated'));

    await click(user, 'sign in wrong');

    expect(await screen.findByText('invalid_credentials')).toBeInTheDocument();
    expect(status()).toHaveTextContent('unauthenticated');
  });

  it('turns a rejected restore into a recoverable error state (no unhandled rejection)', async () => {
    const user = userEvent.setup();
    const adapter = createFakeAuthAdapter({ user: testUser });
    adapter.restoreSession.mockRejectedValueOnce(new Error('offline'));
    renderProbe(adapter);

    await waitFor(() => expect(status()).toHaveTextContent('error'));

    await click(user, 'retry');
    await waitFor(() => expect(status()).toHaveTextContent('authenticated'));
  });

  describe('sign-out', () => {
    it('keeps the session when the server could not confirm it (it may still be valid)', async () => {
      const user = userEvent.setup();
      const adapter = createFakeAuthAdapter({ user: testUser });
      adapter.signOut.mockRejectedValueOnce(new Error('server unavailable'));
      const onIdentityChange = vi.fn();
      renderProbe(adapter, { onIdentityChange });
      await waitFor(() => expect(status()).toHaveTextContent('authenticated'));

      await click(user, 'sign out');

      await waitFor(() =>
        expect(screen.getByTestId('last-error')).toHaveTextContent('error'),
      );
      expect(status()).toHaveTextContent('authenticated');
      expect(onIdentityChange).toHaveBeenCalledTimes(1); // the initial restore only

      await click(user, 'sign out');
      await waitFor(() =>
        expect(status()).toHaveTextContent('unauthenticated'),
      );
    });
  });

  describe('ordering, deadlines and generations', () => {
    it('runs explicit operations after the initial restore, so a late restore cannot overwrite a sign-in', async () => {
      const user = userEvent.setup();
      const restore = deferred<User | null>();
      const adapter = createFakeAuthAdapter();
      adapter.restoreSession.mockReturnValueOnce(restore.promise);
      renderProbe(adapter);

      await click(user, 'sign in');
      expect(adapter.signIn).not.toHaveBeenCalled();

      await act(async () => {
        restore.resolve(null);
        await restore.promise;
      });

      await waitFor(() => expect(status()).toHaveTextContent('authenticated'));
      expect(screen.getByTestId('user')).toHaveTextContent('ada@example.com');
    });

    it('runs operations in call order (sign-out waits for a pending sign-in)', async () => {
      const user = userEvent.setup();
      const signIn = deferred<User>();
      const adapter = createFakeAuthAdapter();
      adapter.signIn.mockReturnValueOnce(signIn.promise);
      renderProbe(adapter);
      await waitFor(() =>
        expect(status()).toHaveTextContent('unauthenticated'),
      );

      await click(user, 'sign in');
      await click(user, 'sign out');
      expect(adapter.signOut).not.toHaveBeenCalled();

      await act(async () => {
        signIn.resolve(testUser);
        await signIn.promise;
      });

      await waitFor(() => expect(adapter.signOut).toHaveBeenCalledTimes(1));
      await waitFor(() =>
        expect(status()).toHaveTextContent('unauthenticated'),
      );
    });

    it('fails a startup restore that never settles, releases the queue and ignores the late call', async () => {
      const user = userEvent.setup();
      const adapter = createFakeAuthAdapter();
      adapter.restoreSession.mockReturnValueOnce(never());
      renderProbe(adapter, { operationTimeoutMs: 50 });
      await click(user, 'sign in');

      await waitFor(() => expect(status()).toHaveTextContent('authenticated'));
      // The hung restore's signal was aborted by its deadline.
      expect(adapter.restoreSession.mock.calls[0]?.[0].aborted).toBe(true);
    });

    it('reports a startup restore timeout as a recoverable error', async () => {
      const user = userEvent.setup();
      const adapter = createFakeAuthAdapter({ user: testUser });
      adapter.restoreSession.mockReturnValueOnce(never());
      renderProbe(adapter, { operationTimeoutMs: 50 });

      await waitFor(() => expect(status()).toHaveTextContent('error'));

      await click(user, 'retry');
      await waitFor(() => expect(status()).toHaveTextContent('authenticated'));
    });

    it('rejects a hung operation with a timeout and runs the next one', async () => {
      const user = userEvent.setup();
      const adapter = createFakeAuthAdapter();
      adapter.signIn.mockReturnValueOnce(never());
      renderProbe(adapter, { operationTimeoutMs: 50 });
      await waitFor(() =>
        expect(status()).toHaveTextContent('unauthenticated'),
      );

      await click(user, 'sign in');
      await click(user, 'sign in');

      expect(await screen.findByText('timeout')).toBeInTheDocument();
      await waitFor(() => expect(status()).toHaveTextContent('authenticated'));
      expect(adapter.signIn).toHaveBeenCalledTimes(2);
    });

    it('ignores a restore result that arrives after unmount and aborts its signal', async () => {
      const restore = deferred<User | null>();
      const adapter = createFakeAuthAdapter();
      adapter.restoreSession.mockReturnValueOnce(restore.promise);
      const onIdentityChange = vi.fn();
      const { unmount } = renderProbe(adapter, { onIdentityChange });
      await waitFor(() => expect(adapter.restoreSession).toHaveBeenCalled());

      unmount();
      await act(async () => {
        restore.resolve(testUser);
        await restore.promise;
      });

      expect(onIdentityChange).not.toHaveBeenCalled();
      expect(adapter.restoreSession.mock.calls[0]?.[0].aborted).toBe(true);
    });

    it('does not call the adapter at all when unmounted before the restore starts', async () => {
      const adapter = createFakeAuthAdapter();
      const { unmount } = renderProbe(adapter);

      unmount();
      await act(() => Promise.resolve());

      expect(adapter.restoreSession).not.toHaveBeenCalled();
    });

    it('never starts operations queued before unmount', async () => {
      const user = userEvent.setup();
      const restore = deferred<User | null>();
      const adapter = createFakeAuthAdapter();
      adapter.restoreSession.mockReturnValueOnce(restore.promise);
      const { unmount } = renderProbe(adapter);
      await click(user, 'sign in');

      unmount();
      await act(async () => {
        restore.resolve(null);
        await restore.promise;
      });

      expect(adapter.signIn).not.toHaveBeenCalled();
    });

    it('starts a replaced adapter immediately and ignores everything from the previous one', async () => {
      const user = userEvent.setup();
      const lateRestore = deferred<User | null>();
      const first = createFakeAuthAdapter();
      first.restoreSession.mockReturnValueOnce(lateRestore.promise);
      const second = createFakeAuthAdapter();
      const { replaceAdapter } = renderProbe(first);
      await click(user, 'sign in'); // queued behind the first adapter's restore

      replaceAdapter(second);
      // The new adapter does not wait for the old, still-pending restore.
      await waitFor(() =>
        expect(status()).toHaveTextContent('unauthenticated'),
      );
      expect(first.restoreSession.mock.calls[0]?.[0].aborted).toBe(true);

      await act(async () => {
        lateRestore.resolve(testUser);
        await lateRestore.promise;
      });

      expect(status()).toHaveTextContent('unauthenticated');
      expect(screen.getByTestId('user')).toHaveTextContent('none');
      expect(first.signIn).not.toHaveBeenCalled();
    });

    it('restores once under Strict Mode (the replayed mount ends the first generation before it calls the adapter)', async () => {
      const adapter = createFakeAuthAdapter({ user: testUser });
      const onIdentityChange = vi.fn();
      renderProbe(adapter, { onIdentityChange, strict: true });

      await waitFor(() => expect(status()).toHaveTextContent('authenticated'));
      expect(onIdentityChange).toHaveBeenCalledTimes(1);
      expect(adapter.restoreSession).toHaveBeenCalledTimes(1);
    });

    it('serializes sign-in behind the initial restore under Strict Mode too', async () => {
      const user = userEvent.setup();
      const restore = deferred<User | null>();
      const adapter = createFakeAuthAdapter();
      adapter.restoreSession.mockReturnValueOnce(restore.promise);
      renderProbe(adapter, { strict: true });

      await click(user, 'sign in');
      expect(adapter.signIn).not.toHaveBeenCalled();
      await act(async () => {
        restore.resolve(null);
        await restore.promise;
      });

      await waitFor(() => expect(status()).toHaveTextContent('authenticated'));
    });
  });

  describe('verifySession (e.g. after an API 401)', () => {
    it('keeps a valid session without showing the startup state', async () => {
      const user = userEvent.setup();
      const adapter = createFakeAuthAdapter({ user: testUser });
      renderProbe(adapter);
      await waitFor(() => expect(status()).toHaveTextContent('authenticated'));
      const check = deferred<User | null>();
      adapter.restoreSession.mockReturnValueOnce(check.promise);

      await click(user, 'verify');
      expect(status()).toHaveTextContent('authenticated');
      await act(async () => {
        check.resolve(testUser);
        await check.promise;
      });

      expect(status()).toHaveTextContent('authenticated');
      expect(adapter.restoreSession).toHaveBeenCalledTimes(2);
    });

    it('ends the session as "expired" when the server has none', async () => {
      const user = userEvent.setup();
      const onIdentityChange = vi.fn();
      const adapter = createFakeAuthAdapter({ user: testUser });
      renderProbe(adapter, { onIdentityChange });
      await waitFor(() => expect(status()).toHaveTextContent('authenticated'));
      adapter.restoreSession.mockResolvedValueOnce(null);

      await click(user, 'verify');

      await waitFor(() =>
        expect(status()).toHaveTextContent('unauthenticated'),
      );
      expect(screen.getByTestId('ended')).toHaveTextContent('expired');
      expect(onIdentityChange).toHaveBeenLastCalledWith(null, testUser);

      await click(user, 'sign in');
      await waitFor(() => expect(status()).toHaveTextContent('authenticated'));
      expect(screen.getByTestId('ended')).toHaveTextContent('none');
    });

    it('never logs out because the check itself failed (network, timeout)', async () => {
      const user = userEvent.setup();
      const adapter = createFakeAuthAdapter({ user: testUser });
      renderProbe(adapter, { operationTimeoutMs: 50 });
      await waitFor(() => expect(status()).toHaveTextContent('authenticated'));
      adapter.restoreSession.mockRejectedValueOnce(new Error('offline'));

      await click(user, 'verify');

      expect(await screen.findByText('error')).toBeInTheDocument();
      expect(status()).toHaveTextContent('authenticated');

      adapter.restoreSession.mockReturnValueOnce(never());
      await click(user, 'verify');
      expect(await screen.findByText('timeout')).toBeInTheDocument();
      expect(status()).toHaveTextContent('authenticated');
    });

    it('shares one check between concurrent callers', async () => {
      const user = userEvent.setup();
      const adapter = createFakeAuthAdapter({ user: testUser });
      renderProbe(adapter);
      await waitFor(() => expect(status()).toHaveTextContent('authenticated'));
      const check = deferred<User | null>();
      adapter.restoreSession.mockReturnValueOnce(check.promise);

      await click(user, 'verify');
      await click(user, 'verify');
      await click(user, 'verify');
      await act(async () => {
        check.resolve(testUser);
        await check.promise;
      });

      expect(adapter.restoreSession).toHaveBeenCalledTimes(2); // startup + one check
    });

    it('does nothing while signed out', async () => {
      const user = userEvent.setup();
      const adapter = createFakeAuthAdapter();
      renderProbe(adapter);
      await waitFor(() =>
        expect(status()).toHaveTextContent('unauthenticated'),
      );

      await click(user, 'verify');

      expect(adapter.restoreSession).toHaveBeenCalledTimes(1);
    });
  });

  it('ends the session as "expired" when completing onboarding finds no session', async () => {
    const user = userEvent.setup();
    const adapter = createFakeAuthAdapter({
      user: { ...testUser, needsOnboarding: true },
    });
    adapter.completeOnboarding.mockRejectedValueOnce(
      new AuthError('unauthenticated'),
    );
    renderProbe(adapter);
    await waitFor(() => expect(status()).toHaveTextContent('authenticated'));

    await click(user, 'complete onboarding');

    await waitFor(() =>
      expect(screen.getByTestId('last-error')).toHaveTextContent(
        'unauthenticated',
      ),
    );
    expect(status()).toHaveTextContent('unauthenticated');
    expect(screen.getByTestId('ended')).toHaveTextContent('expired');
  });

  it('keeps the session when completing onboarding fails for another reason', async () => {
    const user = userEvent.setup();
    const adapter = createFakeAuthAdapter({
      user: { ...testUser, needsOnboarding: true },
    });
    adapter.completeOnboarding.mockRejectedValueOnce(new Error('offline'));
    renderProbe(adapter);
    await waitFor(() => expect(status()).toHaveTextContent('authenticated'));

    await click(user, 'complete onboarding');

    expect(await screen.findByText('error')).toBeInTheDocument();
    expect(status()).toHaveTextContent('authenticated');
  });

  it('reports identity changes (sign-in and sign-out) but not a same-user refresh', async () => {
    const user = userEvent.setup();
    const onIdentityChange = vi.fn();
    const adapter = createFakeAuthAdapter({ user: testUser });
    renderProbe(adapter, { onIdentityChange });

    await waitFor(() => expect(status()).toHaveTextContent('authenticated'));
    expect(onIdentityChange).toHaveBeenLastCalledWith(testUser, null);

    await click(user, 'retry');
    await waitFor(() => expect(status()).toHaveTextContent('authenticated'));
    expect(onIdentityChange).toHaveBeenCalledTimes(1);

    await click(user, 'sign out');
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
