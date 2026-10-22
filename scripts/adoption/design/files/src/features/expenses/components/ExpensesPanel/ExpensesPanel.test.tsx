/** @vitest-environment jsdom */
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';

import { appConfig } from 'config';
import { injectFault } from 'mocks/faults';
import { server } from 'mocks/node';
import { renderWithProviders } from 'test/utils';

import { expenseFixtures, expenseHandlers } from '../../mocks';
import type { ExpenseFilter } from '../../model';

import { ExpensesPanel } from './index';

const renderPanel = (filter: ExpenseFilter = 'all') => {
  const onFilterChange = vi.fn();
  const onAdd = vi.fn();
  renderWithProviders(
    <ExpensesPanel
      filter={filter}
      onFilterChange={onFilterChange}
      onAdd={onAdd}
    />,
  );
  return { onFilterChange, onAdd };
};

describe('ExpensesPanel', () => {
  beforeEach(() => {
    // Also registered in src/mocks/handlers.ts; kept here so the test is
    // self-contained.
    server.use(...expenseHandlers);
  });

  it('shows loading, then each expense with its details, amount and status', async () => {
    renderPanel();
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Loading expenses…',
    );
    const list = await screen.findByRole('list', { name: 'Expenses' });
    const rows = within(list).getAllByRole('listitem');
    expect(rows).toHaveLength(expenseFixtures.length);
    expect(rows[0]).toHaveTextContent(
      'Team lunchMeals · Mar 12, 2026$86.40Pending',
    );
    expect(rows[2]).toHaveTextContent('$1,006.00Approved');
  });

  it('filters by status and reports filter changes', async () => {
    const user = userEvent.setup();
    const { onFilterChange } = renderPanel('approved');
    const list = await screen.findByRole('list', { name: 'Expenses' });
    expect(
      within(list)
        .getAllByRole('heading', { level: 2 })
        .map((h) => h.textContent),
    ).toEqual(['Train to Lyon', 'Design tool licence']);

    await user.selectOptions(screen.getByLabelText('Status'), 'Pending');
    expect(onFilterChange).toHaveBeenCalledWith('pending');
  });

  it('offers to add the first expense when there are none', async () => {
    const user = userEvent.setup();
    server.use(
      http.get(`${appConfig.apiBaseUrl}/expenses`, () =>
        HttpResponse.json({ items: [] }),
      ),
    );
    const { onAdd } = renderPanel();
    expect(
      await screen.findByRole('heading', { name: 'No expenses yet' }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText('Status')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Add expense' }));
    expect(onAdd).toHaveBeenCalledOnce();
  });

  it('says when no expense has the chosen status', async () => {
    server.use(
      http.get(`${appConfig.apiBaseUrl}/expenses`, () =>
        HttpResponse.json({ items: expenseFixtures.slice(1) }),
      ),
    );
    renderPanel('pending');
    expect(
      await screen.findByRole('heading', {
        name: 'No expenses with this status',
      }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Status')).toHaveValue('pending');
  });

  it('recovers from a failed load with "Try again"', async () => {
    const user = userEvent.setup();
    injectFault('expenses.list');
    renderPanel();

    const title = await screen.findByText("We couldn't load this list");
    const alert = title.closest<HTMLElement>('[role="alert"]');
    if (!alert) throw new Error('error state is not announced as an alert');
    await user.click(within(alert).getByRole('button', { name: 'Try again' }));

    expect(
      await screen.findByRole('list', { name: 'Expenses' }),
    ).toBeInTheDocument();
  });
});
