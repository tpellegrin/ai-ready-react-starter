import { delay, http, HttpResponse } from 'msw';
import { z } from 'zod';

import { appConfig } from 'config';
import { consumeFault } from 'mocks/faults';

import { invoiceFixtures } from './fixtures';

const base = `${appConfig.apiBaseUrl}/invoices`;

const serverError = () =>
  HttpResponse.json(
    { title: 'Server error', status: 500 },
    { status: 500, headers: { 'Content-Type': 'application/problem+json' } },
  );

const inputSchema = z.object({ name: z.string(), amount: z.number() });

/**
 * Mock endpoints for this feature (dev, tests). Creating is stateless: the
 * list keeps its fixtures, and tests that need the refreshed list answer it
 * themselves.
 */
export const invoiceHandlers = [
  http.get(base, async () => {
    await delay();
    if (consumeFault('invoices.list')) return serverError();
    return HttpResponse.json({ items: invoiceFixtures });
  }),
  http.post(base, async ({ request }) => {
    await delay();
    if (consumeFault('invoices.create')) return serverError();
    const input = inputSchema.safeParse(await request.json());
    if (!input.success) {
      return HttpResponse.json(
        { errors: { name: ['invalid'] } },
        { status: 422 },
      );
    }
    // Like a real API, the server has the last word on validation.
    const name = input.data.name.toLowerCase();
    if (
      invoiceFixtures.some((invoice) => invoice.name.toLowerCase() === name)
    ) {
      return HttpResponse.json(
        { errors: { name: ['taken'] } },
        { status: 422 },
      );
    }
    return HttpResponse.json(
      {
        id: 'invoices-new',
        name: input.data.name,
        updatedAt: '2026-03-01T10:00:00.000Z',
      },
      { status: 201 },
    );
  }),
];
