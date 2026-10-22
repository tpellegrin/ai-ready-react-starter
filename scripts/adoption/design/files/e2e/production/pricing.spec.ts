import type { Page } from '@playwright/test';

import {
  currentAppPath,
  expect,
  expectNoA11yViolations,
  fakeSessionApi,
  gotoApp,
  test,
} from '../fixtures';

/**
 * The public Pricing page built from the high-fidelity exports in
 * design/pricing: plans, the billing period from the keyboard, and where
 * the calls to action lead. (Written by `pnpm adopt:check --scenario design`.)
 */
test.use({
  // Guests' session checks answer 401.
  allowedConsoleErrors: [
    /Failed to load resource: the server responded with a status of 401/,
  ],
});

const plan = (page: Page, name: string) =>
  page.getByRole('list', { name: 'Plans' }).getByRole('article', { name });

test('guests see the three plans', async ({ page }) => {
  await fakeSessionApi(page);
  await gotoApp(page, '/pricing');

  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'Simple pricing for growing teams',
    }),
  ).toBeVisible();
  await expect(
    page.getByRole('list', { name: 'Plans' }).getByRole('article'),
  ).toHaveCount(3);
  await expect(plan(page, 'Team')).toContainText('Most popular');
  await expect(plan(page, 'Team')).toContainText('€12');
  await expect(
    plan(page, 'Business').getByRole('link', { name: 'Contact sales' }),
  ).toHaveAttribute('href', 'mailto:sales@ledgerly.example');
  await expectNoA11yViolations(page);
});

test('the billing period changes from the keyboard', async ({ page }) => {
  await fakeSessionApi(page);
  await gotoApp(page, '/pricing');

  const monthly = page.getByRole('radio', { name: 'Monthly' });
  await monthly.focus();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('radio', { name: /Yearly/ })).toBeChecked();
  await expect(plan(page, 'Team')).toContainText('€10');
  await expect(plan(page, 'Team')).toContainText(
    'Billed yearly: €120 per user',
  );
  await expect(plan(page, 'Business')).toContainText(
    'Billed yearly: €288 per user',
  );
  await expect(plan(page, 'Starter')).toContainText('Free forever');
});

test('starting a plan leads to sign-in', async ({ page }) => {
  await fakeSessionApi(page);
  await gotoApp(page, '/pricing');

  await plan(page, 'Team')
    .getByRole('button', { name: 'Start free trial' })
    .click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Sign In' }),
  ).toBeVisible();
  expect(currentAppPath(page)).toBe('/sign-in');
});
