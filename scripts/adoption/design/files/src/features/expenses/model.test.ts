import { expenseFixtures } from './mocks';
import {
  expenseFormSchema,
  parseExpenseFilter,
  summarizeExpenses,
} from './model';

describe('expenses model', () => {
  it('sums the amounts and counts pending and approved expenses', () => {
    expect(summarizeExpenses(expenseFixtures)).toEqual({
      total: 1234.5,
      pending: 1,
      approved: 2,
    });
    expect(summarizeExpenses([])).toEqual({
      total: 0,
      pending: 0,
      approved: 0,
    });
  });

  it('reads the status filter from untrusted input', () => {
    expect(parseExpenseFilter('approved')).toBe('approved');
    expect(parseExpenseFilter('archived')).toBe('all');
    expect(parseExpenseFilter(null)).toBe('all');
  });

  it('validates a new expense with error codes', () => {
    const result = expenseFormSchema.safeParse({
      description: ' ',
      amount: null,
      category: 'meals',
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.message)).toEqual([
      'required',
      'required',
    ]);
    expect(
      expenseFormSchema.parse({
        description: ' Taxi ',
        amount: 23,
        category: 'travel',
      }),
    ).toEqual({ description: 'Taxi', amount: 23, category: 'travel' });
  });
});
