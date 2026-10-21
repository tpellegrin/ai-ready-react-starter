import {
  currentAppPath,
  expect,
  expectNoA11yViolations,
  gotoApp,
  test,
} from '../fixtures';

/**
 * Runs against the demo build at the domain root AND under a sub-path
 * (GitHub Pages), so asset URLs, the MSW worker scope and hash routing are
 * verified for both deployments.
 */
test('serves the app and every asset under the base path', async ({ page }) => {
  const failed: string[] = [];
  page.on('response', (response) => {
    if (response.status() >= 400)
      failed.push(`${response.status()} ${response.url()}`);
  });

  await gotoApp(page);
  await expect(
    page.getByRole('heading', { level: 1, name: 'Starter overview' }),
  ).toBeVisible();
  expect(currentAppPath(page)).toBe('/');
  expect(failed).toEqual([]);
  await expectNoA11yViolations(page);
});

// starter:reference-start
test('a protected deep link asks guests to sign in, then returns there', async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'starter.demo.onboarded',
      JSON.stringify(['ada@example.com']),
    );
  });
  await gotoApp(page, '/resources?status=archived');

  await expect(
    page.getByRole('heading', { level: 1, name: 'Sign in' }),
  ).toBeVisible();
  expect(currentAppPath(page)).toMatch(/^\/sign-in\?returnTo=/);

  await page.getByLabel('Email').fill('ada@example.com');
  await page.getByLabel('Password').fill('secret');
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(
    page.getByRole('heading', { level: 1, name: 'Resources' }),
  ).toBeVisible();
  expect(currentAppPath(page)).toBe('/resources?status=archived');
  // Data comes from the in-browser mock API, registered under the base path.
  await expect(
    page.getByRole('heading', { level: 2, name: 'Gamma resource' }),
  ).toBeVisible();

  // A full reload keeps the session, the route and its URL state.
  await page.reload();
  await expect(
    page.getByRole('heading', { level: 2, name: 'Gamma resource' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { level: 2, name: 'Alpha resource' }),
  ).toBeHidden();
});
// starter:reference-end
