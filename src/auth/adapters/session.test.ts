import { http, HttpResponse } from 'msw';

import { createHttpClient } from 'api/http';
import { server } from 'mocks/node';

import { AuthError } from '../types';

import { createSessionAuthAdapter } from './session';

const user = { id: 'u1', email: 'ada@example.com', needsOnboarding: false };
const adapter = createSessionAuthAdapter(createHttpClient({ baseUrl: '/api' }));
const signal = () => new AbortController().signal;

describe('createSessionAuthAdapter', () => {
  it('restores the signed-in user', async () => {
    server.use(http.get('/api/session', () => HttpResponse.json({ user })));
    await expect(adapter.restoreSession(signal())).resolves.toEqual(user);
  });

  it('treats 401 as "signed out", not as an error', async () => {
    server.use(
      http.get('/api/session', () => new HttpResponse(null, { status: 401 })),
    );
    await expect(adapter.restoreSession(signal())).resolves.toBeNull();
  });

  it('rejects restore on server failures so the app can offer a retry', async () => {
    server.use(
      http.get('/api/session', () => new HttpResponse('down', { status: 503 })),
    );
    await expect(adapter.restoreSession(signal())).rejects.toMatchObject({
      kind: 'http',
      status: 503,
    });
  });

  it('rejects a malformed session payload instead of trusting it', async () => {
    server.use(
      http.get('/api/session', () => HttpResponse.json({ user: { id: 42 } })),
    );
    await expect(adapter.restoreSession(signal())).rejects.toMatchObject({
      kind: 'schema',
    });
  });

  it('signs in with credentials and maps 401 to invalid_credentials', async () => {
    server.use(
      http.post('/api/session', async ({ request }) => {
        const body = (await request.json()) as { password?: string };
        return body.password === 'secret'
          ? HttpResponse.json({ user })
          : new HttpResponse(null, { status: 401 });
      }),
    );
    await expect(
      adapter.signIn({ email: user.email, password: 'secret' }),
    ).resolves.toEqual(user);
    await expect(
      adapter.signIn({ email: user.email, password: 'nope' }),
    ).rejects.toEqual(new AuthError('invalid_credentials'));
  });

  it('signs out with an empty 204 response', async () => {
    server.use(
      http.delete(
        '/api/session',
        () => new HttpResponse(null, { status: 204 }),
      ),
    );
    await expect(adapter.signOut()).resolves.toBeUndefined();
  });

  it('completes onboarding', async () => {
    server.use(
      http.post('/api/session/onboarding', () =>
        HttpResponse.json({ user: { ...user, needsOnboarding: false } }),
      ),
    );
    await expect(adapter.completeOnboarding()).resolves.toMatchObject({
      needsOnboarding: false,
    });
  });
});
