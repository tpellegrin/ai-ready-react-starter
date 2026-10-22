import { apiClient } from 'api/client';

import {
  invoiceListSchema,
  invoiceSchema,
  type Invoice,
  type InvoiceInput,
} from './model';

/**
 * Endpoints of this feature. Each call names the schema its response must
 * match and passes the AbortSignal through, so query cancellation aborts it.
 */
export const fetchInvoiceList = async (
  signal?: AbortSignal,
): Promise<Invoice[]> => {
  const { items } = await apiClient.request({
    path: '/invoices',
    schema: invoiceListSchema,
    signal,
  });
  return items;
};

export const createInvoice = (input: InvoiceInput) =>
  apiClient.request({
    method: 'POST',
    path: '/invoices',
    body: input,
    schema: invoiceSchema,
  });
