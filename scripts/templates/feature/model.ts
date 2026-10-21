import { z } from 'zod';

/** Response contract for one item. Every API response is parsed with it. */
export const __entity__Schema = z.object({
  id: z.string().min(1),
  name: z.string(),
  updatedAt: z.iso.datetime(),
});
export type __Entity__ = z.infer<typeof __entity__Schema>;

export const __entity__ListSchema = z.object({
  items: z.array(__entity__Schema),
});
