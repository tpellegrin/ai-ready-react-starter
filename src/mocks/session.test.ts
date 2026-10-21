import { apiClient } from 'api/client';
import { createSessionAuthAdapter } from 'auth/adapters/session';
import { AuthError } from 'auth/types';

/** The real session adapter against the mock session backend. */
describe('mock session backend', () => {
  const adapter = createSessionAuthAdapter(apiClient);
  const signal = new AbortController().signal;

  it('implements the session contract end to end', async () => {
    expect(await adapter.restoreSession(signal)).toBeNull();

    const user = await adapter.signIn({
      email: 'Ada@Example.com',
      password: 'x',
    });
    expect(user).toMatchObject({
      email: 'ada@example.com',
      needsOnboarding: true,
    });
    expect(await adapter.restoreSession(signal)).toEqual(user);

    expect(await adapter.completeOnboarding()).toMatchObject({
      needsOnboarding: false,
    });

    await adapter.signOut();
    expect(await adapter.restoreSession(signal)).toBeNull();

    // Onboarding is remembered per email.
    expect(
      await adapter.signIn({ email: 'ada@example.com', password: 'x' }),
    ).toMatchObject({ needsOnboarding: false });
  });

  it('rejects the password "wrong" as invalid credentials', async () => {
    await expect(
      adapter.signIn({ email: 'ada@example.com', password: 'wrong' }),
    ).rejects.toBeInstanceOf(AuthError);
  });
});
