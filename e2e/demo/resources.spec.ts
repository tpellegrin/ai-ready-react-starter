import type { Page } from '@playwright/test';

import {
  currentAppPath,
  expect,
  gotoApp,
  injectMockFault,
  seedDemoSession,
  test,
  toast,
} from '../fixtures';

test.use({
  // Fault-injection tests make the mock API answer 500 on purpose.
  allowedConsoleErrors: [
    /Failed to load resource: the server responded with a status of (500|422)/,
  ],
});

test.beforeEach(async ({ page }) => {
  await seedDemoSession(page);
});

const list = (page: Page) => page.getByRole('list', { name: 'Resources' });
const itemNames = (page: Page) =>
  list(page).getByRole('heading', { level: 2 }).allTextContents();

test('creates a resource: dialog, validation, success toast and refreshed list', async ({
  page,
}) => {
  await gotoApp(page, '/resources');
  await expect(list(page)).toBeVisible();

  await page.getByRole('button', { name: 'New resource' }).click();
  const dialog = page.getByRole('dialog', { name: 'New resource' });
  await expect(dialog.getByRole('textbox', { name: 'Name' })).toBeFocused();

  // Client-side validation first.
  await dialog.getByRole('button', { name: 'Save' }).click();
  await expect(
    dialog.getByRole('textbox', { name: 'Name' }),
  ).toHaveAccessibleDescription(/This field is required/);

  await dialog.getByRole('textbox', { name: 'Name' }).fill('Delta resource');
  await dialog
    .getByRole('textbox', { name: 'Quantity' })
    .pressSequentially('1500');
  await expect(dialog.getByRole('textbox', { name: 'Quantity' })).toHaveValue(
    '1,500',
  );
  await dialog.getByRole('button', { name: 'Save' }).click();

  await expect(toast(page, 'Resource created')).toBeVisible();
  await expect(dialog).toBeHidden();
  await expect.poll(() => itemNames(page)).toContain('Delta resource');
});

test('shows server validation and save failures without losing input', async ({
  page,
}) => {
  await gotoApp(page, '/resources');
  await page.getByRole('button', { name: 'Edit Beta resource' }).click();
  const dialog = page.getByRole('dialog', { name: 'Edit resource' });
  const name = dialog.getByRole('textbox', { name: 'Name' });

  // 422 from the API: the error appears next to the field.
  await name.fill('Alpha resource');
  await dialog.getByRole('button', { name: 'Save' }).click();
  await expect(name).toHaveAccessibleDescription(/This is already in use/);
  await expect(name).toBeFocused();

  // 500 from the API: a form-level error; the dialog and input stay.
  await name.fill('Beta resource renamed');
  await injectMockFault(page, 'resources.save');
  await dialog.getByRole('button', { name: 'Save' }).click();
  await expect(dialog.getByRole('alert')).toContainText(
    'Something went wrong on our side',
  );
  await expect(name).toHaveValue('Beta resource renamed');

  // Retrying succeeds (faults are one-shot) and focus returns to the opener.
  await dialog.getByRole('button', { name: 'Save' }).click();
  await expect(toast(page, 'Resource saved')).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Edit Beta resource renamed' }),
  ).toBeFocused();
});

test('recovers from a failed list load', async ({ page }) => {
  await gotoApp(page, '/');
  // The app retries 5xx responses twice before showing an error: fail all
  // three attempts.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await injectMockFault(page, 'resources.list');
  }
  await page
    .getByRole('navigation', { name: 'Main' })
    .getByRole('link', { name: 'Resources' })
    .click();

  const alert = page
    .getByRole('alert')
    .filter({ hasText: "We couldn't load resources" });
  // Retries back off (about 1s, then 2s) before the error state shows.
  await expect(alert).toBeVisible({ timeout: 10_000 });
  await alert.getByRole('button', { name: 'Try again' }).click();
  await expect(list(page)).toBeVisible();
});

test('keeps the filter in the URL across refresh and back/forward', async ({
  page,
}) => {
  await gotoApp(page, '/resources');
  await expect(list(page)).toBeVisible();

  await page.getByRole('combobox', { name: 'Status' }).selectOption('archived');
  await expect.poll(() => itemNames(page)).toEqual(['Gamma resource']);
  expect(currentAppPath(page)).toBe('/resources?status=archived');

  await page.reload();
  await expect.poll(() => itemNames(page)).toEqual(['Gamma resource']);
  await expect(page.getByRole('combobox', { name: 'Status' })).toHaveValue(
    'archived',
  );

  await page
    .getByRole('navigation', { name: 'Main' })
    .getByRole('link', { name: 'Dashboard' })
    .click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Dashboard' }),
  ).toBeVisible();

  // Filter changes replace the history entry (no entry per keystroke), so
  // Back returns to the filtered list and Forward to the dashboard.
  await page.goBack();
  await expect.poll(() => itemNames(page)).toEqual(['Gamma resource']);
  expect(currentAppPath(page)).toBe('/resources?status=archived');
  await page.goForward();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Dashboard' }),
  ).toBeVisible();
});

test('works with the keyboard only: open, fill, escape, confirm delete', async ({
  page,
}) => {
  await gotoApp(page, '/resources');
  await expect(list(page)).toBeVisible();

  const create = page.getByRole('button', { name: 'New resource' });
  await create.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'New resource' });
  await expect(dialog.getByRole('textbox', { name: 'Name' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(create).toBeFocused();

  const remove = page.getByRole('button', { name: 'Delete Gamma resource' });
  await remove.focus();
  await page.keyboard.press('Enter');
  const confirm = page.getByRole('alertdialog', {
    name: 'Delete this resource?',
  });
  await expect(confirm.getByRole('button', { name: 'Cancel' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(
    confirm.getByRole('button', { name: 'Delete resource' }),
  ).toBeFocused();
  await page.keyboard.press('Enter');

  await expect(toast(page, 'Resource deleted')).toBeVisible();
  await expect
    .poll(() => itemNames(page))
    .toEqual(['Alpha resource', 'Beta resource']);
  await expect(create).toBeFocused();
});

test('switches language in place, including data-derived copy', async ({
  page,
}) => {
  await gotoApp(page, '/resources');
  await expect(list(page)).toBeVisible();

  await page
    .getByRole('combobox', { name: 'Language selector' })
    .selectOption('pt-BR');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Recursos' }),
  ).toBeVisible();
  await expect(page.getByText(/Quantidade: 1\.250/)).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
});
