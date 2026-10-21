import type { Page, Route } from '@playwright/test';

import {
  currentAppPath,
  expect,
  expectNoA11yViolations,
  gotoApp,
  test,
} from '../fixtures';

/**
 * A real build (VITE_AUTH_PROVIDER=session, no demo, no mocks) talking to a
 * fake backend at /api through page.route. Proves the production wiring:
 * cookie-session adapter, schema validation and error handling.
 */
test.use({
  // Signed-out session checks answer 401, and failure tests answer 5xx.
  allowedConsoleErrors: [
    /Failed to load resource: the server responded with a status of (401|503)/,
  ],
});

const user = {
  id: 'user-1',
  email: 'ada@example.com',
  name: 'Ada',
  needsOnboarding: false,
};
// starter:reference-start
const resources = [
  {
    id: 'res-1',
    name: 'Server resource',
    description: 'From the fake backend.',
    category: 'general',
    quantity: 3,
    status: 'active',
    featured: false,
    updatedAt: '2026-01-15T09:30:00.000Z',
  },
];
// starter:reference-end

const json = (route: Route, status: number, body?: unknown) =>
  route.fulfill({
    status,
    contentType: 'application/json',
    body: body === undefined ? '' : JSON.stringify(body),
  });

/** Minimal stateful backend for the session contract (src/auth/adapters/session.ts). */
const fakeBackend = async (page: Page, { signedIn = false } = {}) => {
  const state = { signedIn, signOutCalls: 0 };
  await page.route('**/api/session', async (route) => {
    const method = route.request().method();
    if (method === 'GET') {
      return state.signedIn ? json(route, 200, { user }) : json(route, 401);
    }
    if (method === 'POST') {
      const body = route.request().postDataJSON() as { password?: string };
      if (body.password === 'wrong') return json(route, 401);
      state.signedIn = true;
      return json(route, 200, { user });
    }
    if (method === 'DELETE') {
      state.signedIn = false;
      state.signOutCalls += 1;
      return route.fulfill({ status: 204 });
    }
    return json(route, 405);
  });
  // starter:reference-start
  await page.route('**/api/resources**', (route) =>
    json(route, 200, { items: resources }),
  );
  // starter:reference-end
  return state;
};

test('guests start on Welcome; no demo hub and no mock service worker', async ({
  page,
}) => {
  await fakeBackend(page);
  await gotoApp(page);

  await expect(
    page.getByRole('heading', { level: 1, name: 'Welcome to React Starter' }),
  ).toBeVisible();
  await expect(page.getByText('Starter overview')).toBeHidden();
  expect(currentAppPath(page)).toBe('/');
  expect(
    await page.evaluate(
      async () => (await navigator.serviceWorker.getRegistrations()).length,
    ),
  ).toBe(0);
  await expectNoA11yViolations(page);
});

// starter:reference-start
test('protected deep link → sign in against the API → back to the page; reload restores the session', async ({
  page,
}) => {
  const backend = await fakeBackend(page);
  await gotoApp(page, '/resources');

  await expect(
    page.getByRole('heading', { level: 1, name: 'Sign in' }),
  ).toBeVisible();
  await expectNoA11yViolations(page);

  await page.getByLabel('Email').fill('ada@example.com');
  await page.getByLabel('Password').fill('wrong');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('alert')).toHaveText('Invalid email or password');

  await page.getByLabel('Password').fill('correct horse');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(
    page.getByRole('heading', { level: 2, name: 'Server resource' }),
  ).toBeVisible();
  expect(currentAppPath(page)).toBe('/resources');

  await page.reload();
  await expect(
    page.getByRole('heading', { level: 2, name: 'Server resource' }),
  ).toBeVisible();

  // Signing out on a protected page leads to sign-in for that page (the
  // guest unknown-route policy), and the server session is gone for real.
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Sign in' }),
  ).toBeVisible();
  expect(backend.signOutCalls).toBe(1);
  await page.reload();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Sign in' }),
  ).toBeVisible();
});
// starter:reference-end

test('protected pages ask guests to sign in first', async ({ page }) => {
  await fakeBackend(page);
  await gotoApp(page, '/flow/onboarding/welcome');

  await expect(
    page.getByRole('heading', { level: 1, name: 'Sign in' }),
  ).toBeVisible();
  expect(currentAppPath(page)).toMatch(/^\/sign-in\?returnTo=/);
  await expect(page.getByText('Step 1 of 3')).toBeHidden();
});

test('an unreachable session check is recoverable in place', async ({
  page,
}) => {
  let failures = 1;
  await page.route('**/api/session', (route) => {
    if (failures > 0) {
      failures -= 1;
      return json(route, 503, { title: 'Unavailable', status: 503 });
    }
    return json(route, 200, { user });
  });
  await gotoApp(page);

  await expect(
    page.getByRole('heading', {
      level: 1,
      name: "We couldn't check your session",
    }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Dashboard' }),
  ).toBeVisible();
});

// starter:reference-start
test('a response that breaks the API contract is shown as an error, not rendered', async ({
  page,
}) => {
  await fakeBackend(page, { signedIn: true });
  await page.route('**/api/resources**', (route) =>
    json(route, 200, { items: [{ id: 1, title: 'wrong shape' }] }),
  );
  await gotoApp(page, '/resources');

  await expect(page.getByRole('alert')).toContainText(
    'The server sent a response we could not read',
  );
  await expect(page.getByText('wrong shape')).toBeHidden();
});
// starter:reference-end
