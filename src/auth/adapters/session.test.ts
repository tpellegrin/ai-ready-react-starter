import { delay, http, HttpResponse } from 'msw';
import { z } from 'zod';

import { CSRF_HEADER, createCsrfToken } from 'api/csrf';
import { createHttpClient } from 'api/http';
import { server } from 'mocks/node';

import { AuthError } from '../types';

import { createSessionAuthAdapter } from './session';

const user = { id: 'u1', email: 'ada@example.com', needsOnboarding: false };
const adapter = createSessionAuthAdapter(createHttpClient({ baseUrl: '/api' }));
const signal = () => new AbortController().signal;
const status = (code: number) => () => new HttpResponse(null, { status: code });

describe('createSessionAuthAdapter', () => {
  it('restores the signed-in user', async () => {
    server.use(http.get('/api/session', () => HttpResponse.json({ user })));
    await expect(adapter.restoreSession(signal())).resolves.toEqual(user);
  });

  it('treats 401 as "signed out", not as an error', async () => {
    server.use(http.get('/api/session', status(401)));
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
      adapter.signIn({ email: user.email, password: 'secret' }, signal()),
    ).resolves.toEqual(user);
    await expect(
      adapter.signIn({ email: user.email, password: 'nope' }, signal()),
    ).rejects.toEqual(new AuthError('invalid_credentials'));
  });

  it('passes the provider signal to every request (deadline, unmount)', async () => {
    server.use(
      http.post('/api/session', async () => {
        await delay('infinite');
        return HttpResponse.json({ user });
      }),
    );
    const controller = new AbortController();
    const pending = adapter.signIn(
      { email: user.email, password: 'secret' },
      controller.signal,
    );
    controller.abort();
    await expect(pending).rejects.toMatchObject({ kind: 'aborted' });
  });

  describe('sign-out', () => {
    it('resolves once the server ends the session (204)', async () => {
      server.use(http.delete('/api/session', status(204)));
      await expect(adapter.signOut(signal())).resolves.toBeUndefined();
    });

    it('treats 401 as already signed out', async () => {
      server.use(http.delete('/api/session', status(401)));
      await expect(adapter.signOut(signal())).resolves.toBeUndefined();
    });

    it('rejects when the server could not confirm it (the session may still be valid)', async () => {
      server.use(http.delete('/api/session', status(503)));
      await expect(adapter.signOut(signal())).rejects.toMatchObject({
        kind: 'http',
        status: 503,
      });
      server.use(http.delete('/api/session', () => HttpResponse.error()));
      await expect(adapter.signOut(signal())).rejects.toMatchObject({
        kind: 'network',
      });
    });
  });

  describe('onboarding completion', () => {
    it('returns the updated user', async () => {
      server.use(
        http.post('/api/session/onboarding', () =>
          HttpResponse.json({ user: { ...user, needsOnboarding: false } }),
        ),
      );
      await expect(adapter.completeOnboarding(signal())).resolves.toMatchObject(
        { needsOnboarding: false },
      );
    });

    it('reports a missing session as AuthError("unauthenticated")', async () => {
      server.use(http.post('/api/session/onboarding', status(401)));
      await expect(adapter.completeOnboarding(signal())).rejects.toEqual(
        new AuthError('unauthenticated'),
      );
    });
  });

  describe('CSRF token transport', () => {
    const setup = () => {
      const csrf = createCsrfToken();
      const client = createHttpClient({
        baseUrl: '/api',
        headers: csrf.headers,
      });
      const seen: Array<[string, string | null]> = [];
      server.use(
        http.post('/api/session', () =>
          HttpResponse.json({ user, csrfToken: 'token-1' }),
        ),
        http.all('/api/items', ({ request }) => {
          seen.push([request.method, request.headers.get(CSRF_HEADER)]);
          return HttpResponse.json({});
        }),
        http.delete('/api/session', status(204)),
        http.get('/api/session', status(401)),
      );
      const send = (method: 'GET' | 'POST') =>
        client.request({ method, path: '/items', schema: z.object({}) });
      return {
        session: createSessionAuthAdapter(client, { csrf }),
        send,
        seen,
      };
    };

    it('sends the session token on unsafe requests only', async () => {
      const { session, send, seen } = setup();
      await session.signIn({ email: user.email, password: 'x' }, signal());

      await send('GET');
      await send('POST');

      expect(seen).toEqual([
        ['GET', null],
        ['POST', 'token-1'],
      ]);
    });

    it('forgets the token when the session ends or is gone', async () => {
      const { session, send, seen } = setup();
      await session.signIn({ email: user.email, password: 'x' }, signal());
      await session.signOut(signal());
      await send('POST');

      await session.signIn({ email: user.email, password: 'x' }, signal());
      await session.restoreSession(signal()); // 401: no session any more
      await send('POST');

      expect(seen).toEqual([
        ['POST', null],
        ['POST', null],
      ]);
    });
  });
});
