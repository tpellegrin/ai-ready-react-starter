import { z } from 'zod';

export const RESOURCE_CATEGORIES = ['general', 'internal', 'external'] as const;
export type ResourceCategory = (typeof RESOURCE_CATEGORIES)[number];

export const RESOURCE_STATUSES = ['active', 'archived'] as const;
export type ResourceStatus = (typeof RESOURCE_STATUSES)[number];

/** Response contract for one resource. Every API response is parsed with it. */
export const resourceSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  description: z.string(),
  category: z.enum(RESOURCE_CATEGORIES),
  quantity: z.number().int().nonnegative(),
  status: z.enum(RESOURCE_STATUSES),
  featured: z.boolean(),
  updatedAt: z.iso.datetime(),
});
export type Resource = z.infer<typeof resourceSchema>;

export const resourceListSchema = z.object({ items: z.array(resourceSchema) });

/** Request body for create/update. */
export type ResourceInput = Omit<Resource, 'id' | 'updatedAt'>;

/** List filter, shared through the URL (`?status=`) so views can be linked. */
export const RESOURCE_FILTERS = ['all', ...RESOURCE_STATUSES] as const;
export type ResourceFilter = (typeof RESOURCE_FILTERS)[number];

const isResourceFilter = (value: string): value is ResourceFilter =>
  (RESOURCE_FILTERS as readonly string[]).includes(value);

/** Unknown or missing values mean "all" (URLs are user input). */
export const parseResourceFilter = (value: string | null): ResourceFilter =>
  value !== null && isResourceFilter(value) ? value : 'all';

/**
 * Form validation. Messages are error codes translated at render time
 * (src/forms/messages.ts). `quantity` is `number | null` while editing
 * (null = empty field) and always a number after validation.
 */
export const resourceFormSchema = z.object({
  name: z.string().trim().min(1, 'required').max(60, 'tooLong'),
  description: z.string().trim().max(280, 'tooLong'),
  category: z.enum(RESOURCE_CATEGORIES, 'invalid'),
  quantity: z
    .number()
    .int('integer')
    .min(0, 'min')
    .max(9999, 'max')
    .nullable()
    .transform((value, ctx) => {
      if (value === null) {
        ctx.addIssue({ code: 'custom', message: 'required' });
        return z.NEVER;
      }
      return value;
    }),
  status: z.enum(RESOURCE_STATUSES),
  featured: z.boolean(),
});
export type ResourceFormValues = z.input<typeof resourceFormSchema>;
export type ResourceFormOutput = z.output<typeof resourceFormSchema>;
