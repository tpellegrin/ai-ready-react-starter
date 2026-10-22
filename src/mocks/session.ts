import { delay, http, HttpResponse } from 'msw';
import { z } from 'zod';

import { userSchema, type User } from 'auth/types';
import { appConfig } from 'config';

/**
 * Mock backend for the cookie-session contract in
 * src/auth/adapters/session.ts, so `VITE_AUTH_PROVIDER=session` works in
 * development (and Storybook/tests) before a real API exists.
 *
 * The "cookie" lives in sessionStorage, so a reload keeps you signed in.
 * Any email signs in; the password "wrong" is rejected. The first sign-in
 * per email needs onboarding. Like a real backend, it issues a CSRF token
 * with the session and requires it (X-CSRF-Token) on its own unsafe
 * endpoints; feature mocks do not check it (a real API checks every unsafe
 * request — docs/session-lifecycle.md).
 */
const base = `${appConfig.apiBaseUrl}/session`;
const SESSION_KEY = 'starter.mocks.session';
const ONBOARDED_KEY = 'starter.mocks.onboarded';
const CSRF_HEADER = 'X-CSRF-Token';

const read = (key: string): unknown => {
  try {
    const raw = sessionStorage.getItem(key);
    return raw === null ? null : (JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
};
const write = (key: string, value: unknown) => {
  if (value === null) sessionStorage.removeItem(key);
  else sessionStorage.setItem(key, JSON.stringify(value));
};

const sessionSchema = z.object({ user: userSchema, csrfToken: z.string() });
type Session = z.infer<typeof sessionSchema>;

const currentSession = (): Session | null =>
  sessionSchema.nullable().catch(null).parse(read(SESSION_KEY));

const startSession = (user: User): Session => {
  const session = { user, csrfToken: crypto.randomUUID() };
  write(SESSION_KEY, session);
  return session;
};
const onboarded = (): string[] =>
  z.array(z.string()).catch([]).parse(read(ONBOARDED_KEY));

const credentialsSchema = z.object({ email: z.string(), password: z.string() });

const problem = (status: number, title: string) =>
  HttpResponse.json(
    { title, status },
    { status, headers: { 'Content-Type': 'application/problem+json' } },
  );
const unauthorized = () => problem(401, 'Unauthorized');

/** The session for an unsafe request, or the error response to return. */
const authorizeUnsafe = (request: Request): Session | Response => {
  const session = currentSession();
  if (!session) return unauthorized();
  if (request.headers.get(CSRF_HEADER) !== session.csrfToken) {
    return problem(403, 'Invalid CSRF token');
  }
  return session;
};

export const sessionHandlers = [
  http.get(base, async () => {
    await delay();
    const session = currentSession();
    return session ? HttpResponse.json(session) : unauthorized();
  }),

  http.post(base, async ({ request }) => {
    await delay();
    const credentials = credentialsSchema.safeParse(await request.json());
    if (!credentials.success || credentials.data.password === 'wrong') {
      return unauthorized();
    }
    const email = credentials.data.email.trim().toLowerCase();
    const user: User = {
      id: `mock:${email}`,
      email,
      needsOnboarding: !onboarded().includes(email),
    };
    return HttpResponse.json(startSession(user));
  }),

  http.delete(base, async ({ request }) => {
    await delay();
    const session = authorizeUnsafe(request);
    if (session instanceof Response) return session;
    write(SESSION_KEY, null);
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${base}/onboarding`, async ({ request }) => {
    await delay();
    const session = authorizeUnsafe(request);
    if (session instanceof Response) return session;
    const user = { ...session.user, needsOnboarding: false };
    write(ONBOARDED_KEY, [...onboarded(), user.email]);
    write(SESSION_KEY, { ...session, user });
    return HttpResponse.json({ user });
  }),
];
