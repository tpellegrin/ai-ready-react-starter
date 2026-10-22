import { apiClient } from 'api/client';

import {
  expenseListSchema,
  expenseSchema,
  type Expense,
  type ExpenseInput,
} from './model';

/**
 * Endpoints of this feature. Each call names the schema its response must
 * match and passes the AbortSignal through, so query cancellation aborts it.
 */
export const fetchExpenseList = async (
  signal?: AbortSignal,
): Promise<Expense[]> => {
  const { items } = await apiClient.request({
    path: '/expenses',
    schema: expenseListSchema,
    signal,
  });
  return items;
};

/** Creates an expense; the server answers with it (status pending). */
export const createExpense = (input: ExpenseInput) =>
  apiClient.request({
    method: 'POST',
    path: '/expenses',
    body: input,
    schema: expenseSchema,
  });
