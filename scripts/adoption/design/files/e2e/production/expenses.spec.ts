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
 * The Expenses page built from the sketches in design/expense-overview, on
 * a real build against a fake backend: navigation, list states, totals, the
 * URL filter, and adding an expense from the keyboard.
 * (Written by `pnpm adopt:check --scenario design`.)
 */
test.use({
  allowedConsoleErrors: [
    /Failed to load resource: the server responded with a status of 503/,
  ],
});

type Expense = {
  id: string;
  description: string;
  category: 'meals' | 'travel' | 'software' | 'other';
  amount: number;
  date: string;
  status: 'pending' | 'approved';
};

const expenses: Expense[] = [
  {
    id: 'exp-1',
    description: 'Team lunch',
    category: 'meals',
    amount: 86.4,
    date: '2026-03-12',
    status: 'pending',
  },
  {
    id: 'exp-2',
    description: 'Train to Lyon',
    category: 'travel',
    amount: 142.1,
    date: '2026-03-10',
    status: 'approved',
  },
  {
    id: 'exp-3',
    description: 'Design tool licence',
    category: 'software',
    amount: 1006,
    date: '2026-03-03',
    status: 'approved',
  },
];

const json = (route: Route, status: number, body?: unknown) =>
  route.fulfill({
    status,
    contentType: 'application/json',
    body: body === undefined ? '' : JSON.stringify(body),
  });

/** A stateful fake of the expenses API; `holdList()` keeps lists pending. */
const fakeExpensesApi = async (page: Page, items: Expense[]) => {
  let held: Promise<void> | null = null;
  const state = {
    items: [...items],
    listStatus: 200,
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
  await page.route('**/api/expenses', async (route) => {
    const method = route.request().method();
    if (method === 'GET') {
      if (held) await held;
      return state.listStatus === 200
        ? json(route, 200, { items: state.items })
        : json(route, state.listStatus, { status: state.listStatus });
    }
    if (method === 'POST') {
      const body = route.request().postDataJSON() as Omit<
        Expense,
        'id' | 'date' | 'status'
      >;
      state.posted.push(body);
      const status = state.createStatuses.shift();
      if (status) return json(route, status, { status });
      const expense: Expense = {
        id: `exp-${state.items.length + 1}`,
        ...body,
        date: '2026-03-14',
        status: 'pending',
      };
      state.items = [...state.items, expense];
      return json(route, 201, expense);
    }
    return json(route, 405);
  });
  return state;
};

const rows = (page: Page) =>
  page
    .getByRole('list', { name: 'Expenses' })
    .getByRole('heading', { level: 2 });
const summary = (page: Page) => page.getByRole('region', { name: 'Summary' });

test('the navigation leads to Expenses: loading, then totals and rows', async ({
  page,
}) => {
  await fakeSessionApi(page, { signedIn: true });
  const api = await fakeExpensesApi(page, expenses);
  const release = api.holdList();
  await gotoApp(page);

  const link = page
    .getByRole('navigation', { name: 'Main' })
    .getByRole('link', { name: 'Expenses' });
  await link.click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Expenses' }),
  ).toBeVisible();
  expect(currentAppPath(page)).toBe('/expenses');
  await expect(link).toHaveAttribute('aria-current', 'page');
  await expect(
    page.getByRole('status').filter({ hasText: 'Loading expenses…' }),
  ).toBeVisible();

  release();
  await expect(rows(page)).toHaveText([
    'Team lunch',
    'Train to Lyon',
    'Design tool licence',
  ]);
  await expect(summary(page).getByRole('listitem')).toHaveText([
    'Total$1,234.50',
    'Pending1',
    'Approved2',
  ]);
  await expectNoA11yViolations(page);
});

test('the status filter narrows the list and lives in the URL', async ({
  page,
}) => {
  await fakeSessionApi(page, { signedIn: true });
  await fakeExpensesApi(page, expenses);
  await gotoApp(page, '/expenses?status=approved');

  await expect(rows(page)).toHaveText(['Train to Lyon', 'Design tool licence']);
  // Totals are about all expenses, not the filtered ones.
  await expect(summary(page).getByRole('listitem').first()).toHaveText(
    'Total$1,234.50',
  );

  await page.getByLabel('Status').selectOption('pending');
  await expect(rows(page)).toHaveText(['Team lunch']);
  expect(currentAppPath(page)).toBe('/expenses?status=pending');
});

test('adding an expense from the keyboard: validation, a failed save, success and focus', async ({
  page,
}) => {
  await fakeSessionApi(page, { signedIn: true });
  const api = await fakeExpensesApi(page, expenses);
  await gotoApp(page, '/expenses');
  await expect(rows(page)).toHaveCount(3);

  const add = page
    .getByRole('main')
    .getByRole('button', { name: 'Add expense' });
  await add.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'Add expense' });
  const description = dialog.getByLabel('Description');
  const amount = dialog.getByLabel('Amount');
  await expect(description).toBeFocused();
  await expect(dialog.getByLabel('Category')).toHaveValue('meals');

  // Errors under each missing field; the first gets focus; nothing is sent.
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(description).toBeFocused();
  await expect(description).toHaveAccessibleDescription(/required/i);
  await expect(amount).toHaveAccessibleDescription(/required/i);
  expect(api.posted).toEqual([]);
  await expectNoA11yViolations(page);

  // A failed save explains itself and keeps the input.
  api.createStatuses.push(503);
  await description.fill('Taxi to the airport');
  await amount.fill('48.5');
  await dialog.getByLabel('Category').selectOption('travel');
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText(
    'Something went wrong on our side',
  );
  await expect(description).toHaveValue('Taxi to the airport');

  // Saving again works: the dialog closes, the list and totals refresh, focus returns.
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(toast(page, 'Expense added')).toBeVisible();
  await expect(rows(page)).toHaveText([
    'Team lunch',
    'Train to Lyon',
    'Design tool licence',
    'Taxi to the airport',
  ]);
  await expect(summary(page).getByRole('listitem')).toHaveText([
    'Total$1,283.00',
    'Pending2',
    'Approved2',
  ]);
  await expect(add).toBeFocused();
  expect(api.posted).toEqual([
    { description: 'Taxi to the airport', amount: 48.5, category: 'travel' },
    { description: 'Taxi to the airport', amount: 48.5, category: 'travel' },
  ]);
});

test('no expenses yet: the empty state offers to add one', async ({ page }) => {
  await fakeSessionApi(page, { signedIn: true });
  await fakeExpensesApi(page, []);
  await gotoApp(page, '/expenses');

  await expect(
    page.getByRole('heading', { name: 'No expenses yet' }),
  ).toBeVisible();
  await expect(summary(page)).toBeHidden();
  await expectNoA11yViolations(page);
  await page
    .getByRole('main')
    .getByRole('button', { name: 'Add expense' })
    .last()
    .click();
  await expect(page.getByRole('dialog', { name: 'Add expense' })).toBeVisible();
});

test('a failed load explains itself and recovers with "Try again"', async ({
  page,
}) => {
  await fakeSessionApi(page, { signedIn: true });
  const api = await fakeExpensesApi(page, expenses);
  api.listStatus = 503;
  await gotoApp(page, '/expenses');

  // Queries retry a 503 twice (src/api/queryClient.ts) before giving up.
  const failure = page
    .getByRole('alert')
    .filter({ hasText: "We couldn't load this list" });
  await expect(failure).toBeVisible({ timeout: 15_000 });
  api.listStatus = 200;
  await failure.getByRole('button', { name: 'Try again' }).click();
  await expect(rows(page)).toHaveCount(3);
});
