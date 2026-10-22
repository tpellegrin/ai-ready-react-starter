import { useQuery } from '@tanstack/react-query';

import { getErrorMessageKey } from 'api/http';
import { formatCurrency } from 'i18n';
import { useI18n } from 'i18n/provider';
import { runDetached } from 'utils/async';

import { EXPENSE_CURRENCY, type ExpenseFilter } from '../../model';
import { expenseListQuery } from '../../queries';

/**
 * Server state lives in TanStack Query; the filtered rows and the view are
 * derived during render. "empty" means no expenses at all (offer to add
 * one); "filtered" means none with the chosen status.
 */
export const useExpensesPanel = (filter: ExpenseFilter) => {
  const { lang } = useI18n();
  const list = useQuery(expenseListQuery());
  const all = list.data ?? [];
  const items = all.filter(
    (item) => filter === 'all' || item.status === filter,
  );
  const dates = new Intl.DateTimeFormat(lang, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });

  const view = list.isPending
    ? 'pending'
    : list.isError
      ? 'error'
      : all.length === 0
        ? 'empty'
        : items.length === 0
          ? 'filtered'
          : 'success';

  return {
    view,
    rows: items.map((item) => ({
      ...item,
      amountText: formatCurrency(item.amount, {
        locale: lang,
        currency: EXPENSE_CURRENCY,
      }),
      dateText: dates.format(new Date(`${item.date}T00:00:00Z`)),
    })),
    errorKey: list.isError ? getErrorMessageKey(list.error) : null,
    isRetrying: list.isFetching,
    retry: () => runDetached(list.refetch()),
  };
};
