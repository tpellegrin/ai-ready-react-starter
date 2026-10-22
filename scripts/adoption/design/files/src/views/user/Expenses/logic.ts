import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { parseExpenseFilter, type ExpenseFilter } from 'features/expenses';

/**
 * The status filter is shareable navigation state, so it lives in the URL
 * (`?status=pending`) and is derived during render; updates replace the
 * history entry. Whether the add dialog is open is local UI state.
 */
export const useExpensesPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isAdding, setAdding] = useState(false);
  const filter = parseExpenseFilter(searchParams.get('status'));

  const setFilter = (next: ExpenseFilter) => {
    setSearchParams(
      (current) => {
        const params = new URLSearchParams(current);
        if (next === 'all') params.delete('status');
        else params.set('status', next);
        return params;
      },
      { replace: true },
    );
  };

  return {
    filter,
    setFilter,
    isAdding,
    setAdding,
    openAdd: () => setAdding(true),
  };
};
