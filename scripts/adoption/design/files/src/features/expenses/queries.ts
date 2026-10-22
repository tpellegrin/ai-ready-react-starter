import {
  queryOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';

import { createExpense, fetchExpenseList } from './api';
import type { ExpenseInput } from './model';

/** Query keys owned by this feature (hierarchical, for invalidation). */
export const expenseKeys = {
  all: ['expenses'] as const,
  list: () => [...expenseKeys.all, 'list'] as const,
};

export const expenseListQuery = () =>
  queryOptions({
    queryKey: expenseKeys.list(),
    queryFn: ({ signal }) => fetchExpenseList(signal),
  });

/**
 * Creates an expense and resolves once the list is fresh, so the totals and
 * the list never show success next to stale data. Not retried automatically.
 */
export const useCreateExpense = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ExpenseInput) => createExpense(input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: expenseKeys.list() }),
  });
};
