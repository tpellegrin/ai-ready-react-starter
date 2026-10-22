import type { Page, Route } from '@playwright/test';

import {
  currentAppPath,
  expect,
  expectNoA11yViolations,
  fakeSessionApi,
  gotoApp,
  test,
  toast,
} from '../fixtures';

/**
 * The product's Invoices page on a real build against a fake backend:
 * reached through the navigation, its list states, and creating an invoice.
 * (Written by `pnpm adopt:check --scenario product` on top of the generated
 * feature, page and navigation link.)
 */
test.use({
  allowedConsoleErrors: [
    /Failed to load resource: the server responded with a status of 503/,
  ],
});

type Invoice = { id: string; name: string; updatedAt: string };

const invoices: Invoice[] = [
  { id: 'inv-1', name: 'Acme Corp', updatedAt: '2026-01-15T09:30:00.000Z' },
  { id: 'inv-2', name: 'Globex', updatedAt: '2026-02-03T14:00:00.000Z' },
];

const json = (route: Route, status: number, body?: unknown) =>
  route.fulfill({
    status,
    contentType: 'application/json',
    body: body === undefined ? '' : JSON.stringify(body),
  });

/**
 * A stateful fake of the invoices API. `listStatus` and `createStatuses`
 * make calls fail; `holdList()` keeps list requests pending until the
 * returned release function runs.
 */
const fakeInvoicesApi = async (page: Page, items: Invoice[]) => {
  let held: Promise<void> | null = null;
  const state = {
    items: [...items],
    listStatus: 200,
    listCalls: 0,
    /** Statuses for the next create calls, in order (then 201). */
    createStatuses: [] as number[],
    posted: [] as unknown[],
    holdList() {
      let release = () => {};
      held = new Promise<void>((resolve) => {
        release = resolve;
      });
      return () => {
        held = null;
        release();
      };
    },
  };
  await page.route('**/api/invoices', async (route) => {
    const method = route.request().method();
    if (method === 'GET') {
      state.listCalls += 1;
      if (held) await held;
      return state.listStatus === 200
        ? json(route, 200, { items: state.items })
        : json(route, state.listStatus, { status: state.listStatus });
    }
    if (method === 'POST') {
      const body = route.request().postDataJSON() as { name: string };
      state.posted.push(body);
      const status = state.createStatuses.shift();
      if (status) return json(route, status, { status });
      const invoice = {
        id: `inv-${state.items.length + 1}`,
        name: body.name,
        updatedAt: '2026-03-01T10:00:00.000Z',
      };
      state.items = [...state.items, invoice];
      return json(route, 201, invoice);
    }
    return json(route, 405);
  });
  return state;
};

const invoiceList = (page: Page) =>
  page.getByRole('list', { name: 'Invoices' });

test('the navigation leads to the Invoices page, which loads its list', async ({
  page,
}) => {
  await fakeSessionApi(page, { signedIn: true });
  const api = await fakeInvoicesApi(page, invoices);
  const release = api.holdList();
  await gotoApp(page);

  // The product's name, from VITE_APP_NAME.
  await expect(page.getByText('Ledgerly', { exact: true })).toBeVisible();
  await expect(page).toHaveTitle('Ledgerly');
  const link = page
    .getByRole('navigation', { name: 'Main' })
    .getByRole('link', { name: 'Invoices' });
  await link.click();

  await expect(
    page.getByRole('heading', { level: 1, name: 'Invoices' }),
  ).toBeVisible();
  expect(currentAppPath(page)).toBe('/invoices');
  await expect(link).toHaveAttribute('aria-current', 'page');
  await expect(
    page.getByRole('status').filter({ hasText: 'Loading invoices…' }),
  ).toBeVisible();

  release();
  await expect(invoiceList(page).getByRole('heading', { level: 2 })).toHaveText(
    ['Acme Corp', 'Globex'],
  );
  await expect(page.getByText('Loading invoices…')).toBeHidden();
  await expectNoA11yViolations(page);
});

test('an empty list says so', async ({ page }) => {
  await fakeSessionApi(page, { signedIn: true });
  await fakeInvoicesApi(page, []);
  await gotoApp(page, '/invoices');

  await expect(
    page.getByRole('heading', { name: 'Nothing here yet' }),
  ).toBeVisible();
  await expect(invoiceList(page)).toBeHidden();
  await expectNoA11yViolations(page);
});

test('a failed load explains itself and recovers with "Try again"', async ({
  page,
}) => {
  await fakeSessionApi(page, { signedIn: true });
  const api = await fakeInvoicesApi(page, invoices);
  api.listStatus = 503;
  await gotoApp(page, '/invoices');

  // Queries retry a 503 twice (src/api/queryClient.ts) before giving up.
  const failure = page
    .getByRole('alert')
    .filter({ hasText: "We couldn't load this list" });
  await expect(failure).toBeVisible({ timeout: 15_000 });
  await expect(failure).toContainText('Something went wrong on our side');
  expect(api.listCalls).toBe(3);
  await expectNoA11yViolations(page);

  api.listStatus = 200;
  await failure.getByRole('button', { name: 'Try again' }).click();
  await expect(invoiceList(page).getByRole('heading', { level: 2 })).toHaveText(
    ['Acme Corp', 'Globex'],
  );
  await expect(failure).toBeHidden();
});

test('creating an invoice: validation, a failed save keeps the input, submitting again saves it', async ({
  page,
}) => {
  await fakeSessionApi(page, { signedIn: true });
  const api = await fakeInvoicesApi(page, invoices);
  await gotoApp(page, '/invoices');
  await expect(invoiceList(page)).toBeVisible();

  const form = page.getByRole('form', { name: 'New invoice' });
  const customer = form.getByLabel('Customer');
  const amount = form.getByLabel('Amount');
  const submit = form.getByRole('button', { name: 'Create invoice' });

  // Client validation: nothing is sent, the first invalid field has focus.
  await submit.click();
  await expect(customer).toBeFocused();
  await expect(customer).toHaveAccessibleDescription(/required/i);
  await expect(amount).toHaveAccessibleDescription(/required/i);
  expect(api.posted).toEqual([]);
  await expectNoA11yViolations(page);

  // A failed save explains itself and keeps what was typed.
  api.createStatuses.push(503);
  await customer.fill('Initech');
  await amount.fill('980.25');
  await submit.click();
  await expect(form.getByRole('alert')).toContainText(
    'Something went wrong on our side',
  );
  await expect(customer).toHaveValue('Initech');
  await expect(amount).toHaveValue(/980\.25/);

  // Submitting again saves it; success is shown with the refreshed list.
  await submit.click();
  await expect(invoiceList(page).getByRole('heading', { level: 2 })).toHaveText(
    ['Acme Corp', 'Globex', 'Initech'],
  );
  await expect(toast(page, 'Invoice created')).toBeVisible();
  await expect(customer).toHaveValue('');
  await expect(form.getByRole('alert')).toBeHidden();
  expect(api.posted).toEqual([
    { name: 'Initech', amount: 980.25 },
    { name: 'Initech', amount: 980.25 },
  ]);
  await expectNoA11yViolations(page);
});
