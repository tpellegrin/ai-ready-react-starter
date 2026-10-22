import { expect, expectFlowSettled, gotoApp, test } from '../fixtures';

/**
 * The Vite dev server runs React's development build, where Strict Mode
 * (src/main.tsx) mounts, unmounts and remounts every effect. Built apps
 * never do that, so this is the only browser-level check that transitions,
 * session restore and focus handling survive the replay. Uses the
 * development setup (.env.development: in-browser mock API).
 */
test('a flow works under Strict Mode: steps settle forward and back, then onboarding completes', async ({
  page,
}) => {
  await gotoApp(page, '/sign-in');
  await page.getByLabel('Email').fill(`strict.${Date.now()}@example.com`);
  await page.getByLabel('Password').fill('secret');
  await page.getByRole('button', { name: 'Sign in' }).click();

  for (const [action, step] of [
    [null, 1],
    ['Continue', 2],
    ['Go back', 1],
    ['Continue', 2],
    ['Continue', 3],
  ] as const) {
    if (action) await page.getByRole('button', { name: action }).click();
    await expect(page.getByText(`Step ${step} of 3`)).toBeVisible();
    await expectFlowSettled(page);
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  }

  await page.getByRole('button', { name: 'Go to Dashboard' }).click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Dashboard' }),
  ).toBeVisible();
});
