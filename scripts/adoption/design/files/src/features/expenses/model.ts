import { z } from 'zod';

export const EXPENSE_CATEGORIES = [
  'meals',
  'travel',
  'software',
  'other',
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const EXPENSE_STATUSES = ['pending', 'approved'] as const;
export type ExpenseStatus = (typeof EXPENSE_STATUSES)[number];

/** Response contract for one expense. Every API response is parsed with it. */
export const expenseSchema = z.object({
  id: z.string().min(1),
  description: z.string(),
  category: z.enum(EXPENSE_CATEGORIES),
  /** In US dollars (the API has no currency yet). */
  amount: z.number(),
  date: z.iso.date(),
  status: z.enum(EXPENSE_STATUSES),
});
export type Expense = z.infer<typeof expenseSchema>;

export const expenseListSchema = z.object({
  items: z.array(expenseSchema),
});

/** Amounts are US dollars until the API says otherwise. */
export const EXPENSE_CURRENCY = 'USD';

export const EXPENSE_FILTERS = ['all', ...EXPENSE_STATUSES] as const;
export type ExpenseFilter = (typeof EXPENSE_FILTERS)[number];

/** A filter from untrusted input (the URL); anything unknown is "all". */
export const parseExpenseFilter = (value: string | null): ExpenseFilter =>
  EXPENSE_FILTERS.find((filter) => filter === value) ?? 'all';

/** Totals shown above the list, always from the loaded expenses. */
export const summarizeExpenses = (items: readonly Expense[]) => ({
  total: items.reduce((sum, item) => sum + item.amount, 0),
  pending: items.filter((item) => item.status === 'pending').length,
  approved: items.filter((item) => item.status === 'approved').length,
});

/**
 * New-expense form. Messages are error codes translated at render time
 * (src/forms/messages.ts); `amount` is `number | null` while editing.
 */
export const expenseFormSchema = z.object({
  description: z.string().trim().min(1, 'required').max(80, 'tooLong'),
  amount: z
    .number()
    .min(0.01, 'min')
    .max(100_000, 'max')
    .nullable()
    .transform((value, ctx) => {
      if (value === null) {
        ctx.addIssue({ code: 'custom', message: 'required' });
        return z.NEVER;
      }
      return value;
    }),
  category: z.enum(EXPENSE_CATEGORIES),
});
export type ExpenseFormValues = z.input<typeof expenseFormSchema>;
/** Request body for a new expense. */
export type ExpenseInput = z.output<typeof expenseFormSchema>;
