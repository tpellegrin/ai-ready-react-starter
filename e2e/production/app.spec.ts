import type { Page, Route } from '@playwright/test';

import {
  currentAppPath,
  expect,
  expectFlowSettled,
  expectNoA11yViolations,
  fakeSessionApi,
  gotoApp,
  signInWithForm,
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

const json = (route: Route, status: number, body?: unknown) =>
  route.fulfill({
    status,
    contentType: 'application/json',
    body: body === undefined ? '' : JSON.stringify(body),
  });

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

/** The session API plus the reference feature's list endpoint. */
const fakeBackend = async (page: Page, options = {}) => {
  const api = await fakeSessionApi(page, options);
  const seen: string[] = [];
  await page.route('**/api/resources**', (route) => {
    seen.push(route.request().url());
    return api.signedIn
      ? json(route, 200, { items: resources })
      : json(route, 401);
  });
  return { api, seen };
};
// starter:reference-end

test('guests start on Welcome; no demo hub and no mock service worker', async ({
  page,
}) => {
  await fakeSessionApi(page);
  await gotoApp(page);

  await expect(
    page.getByRole('heading', { level: 1, name: /^Welcome to / }),
  ).toBeVisible();
  await expect(page.getByText('Starter overview')).toBeHidden();
  expect(currentAppPath(page)).toBe('/');
  expect(
    await page.evaluate(
      async () => (await navigator.serviceWorker.getRegistrations()).length,
    ),
  ).toBe(0);
});

// starter:reference-start
test('protected deep link → sign in against the API → back to the page; reload restores the session', async ({
  page,
}) => {
  const { api } = await fakeBackend(page);
  await gotoApp(page, '/resources');

  await expect(
    page.getByRole('heading', { level: 1, name: 'Sign in' }),
  ).toBeVisible();
  await expectNoA11yViolations(page);

  await signInWithForm(page, 'wrong');
  await expect(page.getByRole('alert')).toHaveText('Invalid email or password');

  await signInWithForm(page, 'correct horse');
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
  expect(api.calls.signOut).toBe(1);
  await page.reload();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Sign in' }),
  ).toBeVisible();
});

test('a protected deep link with a query survives sign-in and required onboarding', async ({
  page,
}) => {
  await fakeBackend(page, { needsOnboarding: true });
  await gotoApp(page, '/resources?status=archived');

  await signInWithForm(page);
  for (const step of [1, 2]) {
    await expect(page.getByText(`Step ${step} of 3`)).toBeVisible();
    await expectFlowSettled(page);
    await page.getByRole('button', { name: 'Continue' }).click();
  }
  await expect(page.getByText('Step 3 of 3')).toBeVisible();
  await expectFlowSettled(page);
  await page.getByRole('button', { name: 'Go to Dashboard' }).click();

  await expect(
    page.getByRole('heading', { level: 1, name: 'Resources' }),
  ).toBeVisible();
  expect(currentAppPath(page)).toBe('/resources?status=archived');
});

test('an expired session on an API request leads to sign-in for the same page', async ({
  page,
}) => {
  const { api } = await fakeBackend(page, { signedIn: true });
  await gotoApp(page, '/resources?status=active');
  await expect(
    page.getByRole('heading', { level: 2, name: 'Server resource' }),
  ).toBeVisible();

  // The server forgets the session; the next request answers 401 and the
  // session check confirms it.
  api.signedIn = false;
  await page.getByLabel('Status').selectOption('archived');

  await expect(
    page.getByRole('heading', { level: 1, name: 'Sign in' }),
  ).toBeVisible();
  await expect(page.getByRole('status')).toContainText(
    'Your session has expired',
  );
  expect(currentAppPath(page)).toMatch(/^\/sign-in\?returnTo=/);
});
// starter:reference-end

test('protected pages ask guests to sign in first', async ({ page }) => {
  await fakeSessionApi(page);
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
  const api = await fakeSessionApi(page, { signedIn: true });
  api.fail('restore', 503);
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
  await fakeSessionApi(page, { signedIn: true });
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
