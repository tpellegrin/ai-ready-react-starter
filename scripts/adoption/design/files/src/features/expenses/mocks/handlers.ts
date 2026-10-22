import { delay, http, HttpResponse } from 'msw';
import { z } from 'zod';

import { appConfig } from 'config';
import { consumeFault } from 'mocks/faults';

import { EXPENSE_CATEGORIES } from '../model';

import { expenseFixtures } from './fixtures';

const base = `${appConfig.apiBaseUrl}/expenses`;

const serverError = () =>
  HttpResponse.json(
    { title: 'Server error', status: 500 },
    { status: 500, headers: { 'Content-Type': 'application/problem+json' } },
  );

const inputSchema = z.object({
  description: z.string(),
  amount: z.number(),
  category: z.enum(EXPENSE_CATEGORIES),
});

/**
 * Mock endpoints for this feature (dev, tests). Creating is stateless: the
 * list keeps its fixtures, and tests that need the refreshed list answer it
 * themselves.
 */
export const expenseHandlers = [
  http.get(base, async () => {
    await delay();
    if (consumeFault('expenses.list')) return serverError();
    return HttpResponse.json({ items: expenseFixtures });
  }),
  http.post(base, async ({ request }) => {
    await delay();
    if (consumeFault('expenses.create')) return serverError();
    const input = inputSchema.safeParse(await request.json());
    if (!input.success) {
      return HttpResponse.json(
        { errors: { description: ['invalid'] } },
        { status: 422 },
      );
    }
    // Like a real API, the server has the last word on validation.
    const description = input.data.description.toLowerCase();
    if (
      expenseFixtures.some(
        (expense) => expense.description.toLowerCase() === description,
      )
    ) {
      return HttpResponse.json(
        { errors: { description: ['taken'] } },
        { status: 422 },
      );
    }
    return HttpResponse.json(
      {
        id: 'exp-new',
        ...input.data,
        date: '2026-03-14',
        status: 'pending',
      },
      { status: 201 },
    );
  }),
];
