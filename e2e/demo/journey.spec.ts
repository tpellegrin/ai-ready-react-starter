import {
  currentAppPath,
  expect,
  gotoApp,
  test,
  waitForRouteTransition,
} from '../fixtures';

test('a new user signs in, completes onboarding and signs out', async ({
  page,
}) => {
  await gotoApp(page);
  await page.getByRole('link', { name: /^Sign In/ }).click();

  await page.getByLabel('Email').fill('new.user@example.com');
  await page.getByLabel('Password').fill('secret');
  await page.getByRole('button', { name: 'Sign in' }).click();

  for (const step of [1, 2]) {
    await expect(page.getByText(`Step ${step} of 3`)).toBeVisible();
    await waitForRouteTransition(page);
    await page.getByRole('button', { name: 'Continue' }).click();
  }
  await expect(page.getByText('Step 3 of 3')).toBeVisible();
  await waitForRouteTransition(page);
  await page.getByRole('button', { name: 'Go to dashboard' }).click();

  await expect(
    page.getByRole('heading', { level: 1, name: 'Dashboard' }),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Starter overview' }),
  ).toBeVisible();

  // Signed out for real: a reload does not restore the session.
  await page.reload();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Starter overview' }),
  ).toBeVisible();
  // starter:reference-start
  // ...and protected pages ask for sign-in again.
  await gotoApp(page, '/resources');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Sign in' }),
  ).toBeVisible();
  // starter:reference-end
});

test('invalid credentials keep the user on the form with an error', async ({
  page,
}) => {
  await gotoApp(page, '/sign-in');
  await page.getByLabel('Email').fill('ada@example.com');
  // The demo adapter treats the password "fail" as invalid credentials.
  await page.getByLabel('Password').fill('fail');
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page.getByRole('alert')).toHaveText('Invalid email or password');
  expect(currentAppPath(page)).toBe('/sign-in');
});

test('unknown paths show Not Found with a way home', async ({ page }) => {
  await gotoApp(page, '/does-not-exist');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Page not found' }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Go back home' }).click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Starter overview' }),
  ).toBeVisible();
});
