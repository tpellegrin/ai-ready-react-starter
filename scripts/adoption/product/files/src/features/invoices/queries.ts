import {
  queryOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';

import { createInvoice, fetchInvoiceList } from './api';
import type { InvoiceInput } from './model';

/** Query keys owned by this feature (hierarchical, for invalidation). */
export const invoiceKeys = {
  all: ['invoices'] as const,
  list: () => [...invoiceKeys.all, 'list'] as const,
};

export const invoiceListQuery = () =>
  queryOptions({
    queryKey: invoiceKeys.list(),
    queryFn: ({ signal }) => fetchInvoiceList(signal),
  });

/**
 * Creates an invoice and resolves once the list is fresh, so the UI never
 * reports success next to a stale list. Not retried automatically.
 */
export const useCreateInvoice = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: InvoiceInput) => createInvoice(input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: invoiceKeys.list() }),
  });
};
