import {
  expect,
  expectFlowSettled,
  expectNoA11yViolations,
  fakeSessionApi,
  gotoApp,
  longestMotion,
  test,
} from '../fixtures';

/**
 * Automated accessibility checks (axe) and reduced motion on a real build.
 * These live with the production target so they survive adoption. axe
 * finds a subset of problems; keyboard paths, focus order and announcements
 * are covered by interaction tests and still need manual review.
 */
test.use({
  allowedConsoleErrors: [
    /Failed to load resource: the server responded with a status of 401/,
  ],
});

test.describe('pages have no axe violations', () => {
  for (const [path, heading] of [
    ['/', /^Welcome to /],
    ['/sign-in', 'Sign in'],
    ['/does-not-exist', 'Page not found'],
  ] as const) {
    test(`guest ${path}`, async ({ page }) => {
      await fakeSessionApi(page);
      await gotoApp(page, path);
      await expect(
        page.getByRole('heading', { level: 1, name: heading }),
      ).toBeVisible();
      await expectNoA11yViolations(page);
    });
  }

  test('dashboard', async ({ page }) => {
    await fakeSessionApi(page, { signedIn: true });
    await gotoApp(page, '/');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Dashboard' }),
    ).toBeVisible();
    await expectNoA11yViolations(page);
  });

  test('onboarding step', async ({ page }) => {
    await fakeSessionApi(page, { signedIn: true, needsOnboarding: true });
    await gotoApp(page, '/');
    await expect(page.getByText('Step 1 of 3')).toBeVisible();
    await expectFlowSettled(page);
    await expectNoA11yViolations(page);
  });
});

test.describe('motion', () => {
  // The start page reveals its content; if yours does not animate, point
  // the control at a page that does, so the reduced-motion test keeps
  // measuring something.
  test('animates by default (control for the reduced-motion test)', async ({
    page,
  }) => {
    await fakeSessionApi(page);
    await gotoApp(page, '/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect(await page.evaluate(longestMotion)).toBeGreaterThan(0.1);
  });

  test('honours prefers-reduced-motion on pages and flow steps', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const api = await fakeSessionApi(page);
    await gotoApp(page, '/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect(await page.evaluate(longestMotion)).toBeLessThanOrEqual(0.1);

    api.signedIn = true;
    api.user = { ...api.user, needsOnboarding: true };
    await page.reload();
    await expect(page.getByText('Step 1 of 3')).toBeVisible();
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.getByText('Step 2 of 3')).toBeVisible();
    expect(await page.evaluate(longestMotion)).toBeLessThanOrEqual(0.1);
  });
});
