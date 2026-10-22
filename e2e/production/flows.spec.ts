import type { Page } from '@playwright/test';

import {
  currentAppPath,
  expect,
  expectFlowSettled,
  fakeSessionApi,
  gotoApp,
  signInWithForm,
  test,
} from '../fixtures';

/**
 * Multi-step flow and session journeys on a real build: slide transitions
 * settle, exiting steps leave the DOM and the accessibility tree, focus
 * stays in the page, and failures are recoverable in place. Runs in desktop
 * Chromium and mobile WebKit (playwright.config.ts).
 */
test.use({
  allowedConsoleErrors: [
    /Failed to load resource: the server responded with a status of (401|503)/,
  ],
});

/**
 * The step is shown and settled; the exiting step is gone (one page
 * heading). After moving within the flow, focus is in the page, not dropped
 * on <body> (a fresh page load starts on <body>, as usual).
 */
const atStep = async (
  page: Page,
  n: number,
  { moved = true }: { moved?: boolean } = {},
) => {
  await expect(page.getByText(`Step ${n} of 3`)).toBeVisible();
  await expectFlowSettled(page);
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  if (!moved) return;
  expect(
    await page.evaluate(() => document.activeElement !== document.body),
  ).toBe(true);
};

test('a new user moves forward and back through onboarding, then reaches the dashboard', async ({
  page,
}) => {
  const api = await fakeSessionApi(page, { needsOnboarding: true });
  await gotoApp(page, '/sign-in');
  await signInWithForm(page);

  await atStep(page, 1, { moved: false });
  await page.getByRole('button', { name: 'Continue' }).click();
  await atStep(page, 2);
  await page.getByRole('button', { name: 'Go back' }).click();
  await atStep(page, 1);
  await page.getByRole('button', { name: 'Continue' }).click();
  await atStep(page, 2);
  await page.getByRole('button', { name: 'Continue' }).click();
  await atStep(page, 3);
  await page.getByRole('button', { name: 'Go to Dashboard' }).click();

  await expect(
    page.getByRole('heading', { level: 1, name: 'Dashboard' }),
  ).toBeVisible();
  expect(currentAppPath(page)).toBe('/');
  expect(api.calls.onboarding).toBe(1);
});

test('a failed onboarding completion stays on the step with the reason, and can be retried', async ({
  page,
}) => {
  const api = await fakeSessionApi(page, {
    signedIn: true,
    needsOnboarding: true,
  });
  await gotoApp(page, '/flow/onboarding/complete');
  await atStep(page, 3, { moved: false });

  api.fail('onboarding', 503);
  await page.getByRole('button', { name: 'Go to Dashboard' }).click();
  await expect(page.getByRole('alert')).toContainText(
    'Something went wrong on our side',
  );
  await expect(page.getByText('Step 3 of 3')).toBeVisible();

  await page.getByRole('button', { name: 'Go to Dashboard' }).click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Dashboard' }),
  ).toBeVisible();
});

test('a failed sign-out keeps the (still valid) session and explains; retrying signs out', async ({
  page,
}) => {
  const api = await fakeSessionApi(page, { signedIn: true });
  await gotoApp(page, '/');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Dashboard' }),
  ).toBeVisible();

  api.fail('signOut', 503);
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByRole('alert')).toContainText(
    "We couldn't sign you out",
  );
  await expect(
    page.getByRole('heading', { level: 1, name: 'Dashboard' }),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(
    page.getByRole('heading', { level: 1, name: /^Welcome to / }),
  ).toBeVisible();
  expect(api.calls.signOut).toBe(2);
});
