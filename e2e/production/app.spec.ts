import {
  currentAppPath,
  expect,
  fakeSessionApi,
  gotoApp,
  test,
} from '../fixtures';

/**
 * A real build (VITE_AUTH_PROVIDER=session, no demo, no mocks) talking to a
 * fake backend at /api through page.route. Proves the production wiring:
 * cookie-session adapter and its failure handling.
 */
test.use({
  // Signed-out session checks answer 401, and failure tests answer 5xx.
  allowedConsoleErrors: [
    /Failed to load resource: the server responded with a status of (401|503)/,
  ],
});

// The reference feature's journeys are in resources.spec.ts (removed with
// it on adoption).

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
