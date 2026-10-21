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
 * per email needs onboarding.
 */
const base = `${appConfig.apiBaseUrl}/session`;
const SESSION_KEY = 'starter.mocks.session';
const ONBOARDED_KEY = 'starter.mocks.onboarded';

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

const currentUser = (): User | null =>
  userSchema.nullable().catch(null).parse(read(SESSION_KEY));
const onboarded = (): string[] =>
  z.array(z.string()).catch([]).parse(read(ONBOARDED_KEY));

const credentialsSchema = z.object({ email: z.string(), password: z.string() });

const unauthorized = () =>
  HttpResponse.json(
    { title: 'Unauthorized', status: 401 },
    { status: 401, headers: { 'Content-Type': 'application/problem+json' } },
  );

export const sessionHandlers = [
  http.get(base, async () => {
    await delay();
    const user = currentUser();
    return user ? HttpResponse.json({ user }) : unauthorized();
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
    write(SESSION_KEY, user);
    return HttpResponse.json({ user });
  }),

  http.delete(base, async () => {
    await delay();
    write(SESSION_KEY, null);
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${base}/onboarding`, async () => {
    await delay();
    const user = currentUser();
    if (!user) return unauthorized();
    const updated = { ...user, needsOnboarding: false };
    write(ONBOARDED_KEY, [...onboarded(), user.email]);
    write(SESSION_KEY, updated);
    return HttpResponse.json({ user: updated });
  }),
];
