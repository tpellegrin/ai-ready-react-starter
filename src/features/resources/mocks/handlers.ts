import { delay, http, HttpResponse } from 'msw';
import { z } from 'zod';

import { appConfig } from 'config';
import { consumeFault } from 'mocks/faults';

import { RESOURCE_CATEGORIES, RESOURCE_STATUSES } from '../model';

import { resourceDb } from './db';

const base = `${appConfig.apiBaseUrl}/resources`;

/** What a real server would validate (independently of the client). */
const inputSchema = z.object({
  name: z.string().trim().min(1, 'required').max(60, 'tooLong'),
  description: z.string().trim().max(280, 'tooLong'),
  category: z.enum(RESOURCE_CATEGORIES, 'invalid'),
  quantity: z.number().int('integer').min(0, 'min').max(9999, 'max'),
  status: z.enum(RESOURCE_STATUSES, 'invalid'),
  featured: z.boolean(),
});

const problem = (status: number, errors?: Record<string, string[]>) =>
  HttpResponse.json(
    {
      title: status === 422 ? 'Validation failed' : 'Server error',
      status,
      errors,
    },
    { status, headers: { 'Content-Type': 'application/problem+json' } },
  );

const parseInput = async (request: Request, exceptId?: string) => {
  const parsed = inputSchema.safeParse(await request.json());
  if (!parsed.success) {
    const errors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const field = String(issue.path[0] ?? 'form');
      errors[field] = [...(errors[field] ?? []), issue.message];
    }
    return { error: problem(422, errors) };
  }
  if (resourceDb.isNameTaken(parsed.data.name, exceptId)) {
    return { error: problem(422, { name: ['taken'] }) };
  }
  return { input: parsed.data };
};

export const resourceHandlers = [
  http.get(base, async ({ request }) => {
    await delay();
    if (consumeFault('resources.list')) return problem(500);
    const status = new URL(request.url).searchParams.get('status');
    const parsedStatus = z.enum(RESOURCE_STATUSES).safeParse(status);
    return HttpResponse.json({
      items: resourceDb.list(
        parsedStatus.success ? parsedStatus.data : undefined,
      ),
    });
  }),

  http.post(base, async ({ request }) => {
    await delay();
    if (consumeFault('resources.save')) return problem(500);
    const { input, error } = await parseInput(request);
    if (error) return error;
    return HttpResponse.json(resourceDb.create(input), { status: 201 });
  }),

  http.put(`${base}/:id`, async ({ request, params }) => {
    await delay();
    if (consumeFault('resources.save')) return problem(500);
    const id = String(params.id);
    if (!resourceDb.find(id)) return problem(404);
    const { input, error } = await parseInput(request, id);
    if (error) return error;
    return HttpResponse.json(resourceDb.update(id, input));
  }),

  http.delete(`${base}/:id`, async ({ params }) => {
    await delay();
    if (consumeFault('resources.delete')) return problem(500);
    return resourceDb.remove(String(params.id))
      ? new HttpResponse(null, { status: 204 })
      : problem(404);
  }),
];
