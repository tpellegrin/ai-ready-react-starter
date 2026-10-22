import type { Expense } from '../model';

/** Deterministic seed data: the rows of the sketch. */
export const expenseFixtures: readonly Expense[] = [
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
