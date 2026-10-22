import { apiClient, csrfToken } from 'api/client';
import { createSessionAuthAdapter } from 'auth/adapters/session';
import { AuthError } from 'auth/types';

/** The real session adapter and API client against the mock session backend. */
describe('mock session backend', () => {
  const adapter = createSessionAuthAdapter(apiClient, { csrf: csrfToken });
  const signal = () => new AbortController().signal;

  it('implements the session contract end to end (CSRF token included)', async () => {
    expect(await adapter.restoreSession(signal())).toBeNull();

    const user = await adapter.signIn(
      { email: 'Ada@Example.com', password: 'x' },
      signal(),
    );
    expect(user).toMatchObject({
      email: 'ada@example.com',
      needsOnboarding: true,
    });
    expect(await adapter.restoreSession(signal())).toEqual(user);

    expect(await adapter.completeOnboarding(signal())).toMatchObject({
      needsOnboarding: false,
    });

    await adapter.signOut(signal());
    expect(await adapter.restoreSession(signal())).toBeNull();

    // Onboarding is remembered per email.
    expect(
      await adapter.signIn(
        { email: 'ada@example.com', password: 'x' },
        signal(),
      ),
    ).toMatchObject({ needsOnboarding: false });
  });

  it('refuses unsafe session requests without the CSRF token', async () => {
    await adapter.signIn({ email: 'ada@example.com', password: 'x' }, signal());
    const withoutToken = createSessionAuthAdapter(apiClient);
    csrfToken.set(null);

    await expect(withoutToken.signOut(signal())).rejects.toMatchObject({
      kind: 'http',
      status: 403,
    });
  });

  it('rejects the password "wrong" as invalid credentials', async () => {
    await expect(
      adapter.signIn({ email: 'ada@example.com', password: 'wrong' }, signal()),
    ).rejects.toBeInstanceOf(AuthError);
  });
});
