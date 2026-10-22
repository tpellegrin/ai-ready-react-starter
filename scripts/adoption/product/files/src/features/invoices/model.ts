import { z } from 'zod';

/** Response contract for one item. Every API response is parsed with it. */
export const invoiceSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  updatedAt: z.iso.datetime(),
});
export type Invoice = z.infer<typeof invoiceSchema>;

export const invoiceListSchema = z.object({
  items: z.array(invoiceSchema),
});

/**
 * New-invoice form. Messages are error codes translated at render time
 * (src/forms/messages.ts); `amount` is `number | null` while editing.
 */
export const invoiceFormSchema = z.object({
  name: z.string().trim().min(1, 'required').max(80, 'tooLong'),
  amount: z
    .number()
    .min(0.01, 'min')
    .max(1_000_000, 'max')
    .nullable()
    .transform((value, ctx) => {
      if (value === null) {
        ctx.addIssue({ code: 'custom', message: 'required' });
        return z.NEVER;
      }
      return value;
    }),
});
export type InvoiceFormValues = z.input<typeof invoiceFormSchema>;
/** Request body for a new invoice. */
export type InvoiceInput = z.output<typeof invoiceFormSchema>;
