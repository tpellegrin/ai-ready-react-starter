import { useQuery } from '@tanstack/react-query';

import { formatCurrency, formatNumber } from 'i18n';
import { useI18n } from 'i18n/provider';

import { EXPENSE_CURRENCY, summarizeExpenses } from '../../model';
import { expenseListQuery } from '../../queries';

/**
 * The summary shares the list's query (one request) and derives its values
 * during render. It holds space while loading and stays out of the way when
 * there is nothing to sum or the load failed (the list explains that).
 */
export const useExpenseSummary = () => {
  const { lang } = useI18n();
  const list = useQuery(expenseListQuery());

  if (list.isPending) return { view: 'pending' as const, tiles: [] };
  if (list.isError || list.data.length === 0) {
    return { view: 'hidden' as const, tiles: [] };
  }
  const summary = summarizeExpenses(list.data);
  return {
    view: 'content' as const,
    tiles: [
      {
        id: 'total',
        value: formatCurrency(summary.total, {
          locale: lang,
          currency: EXPENSE_CURRENCY,
        }),
      },
      { id: 'pending', value: formatNumber(summary.pending, { locale: lang }) },
      {
        id: 'approved',
        value: formatNumber(summary.approved, { locale: lang }),
      },
    ] as const,
  };
};
