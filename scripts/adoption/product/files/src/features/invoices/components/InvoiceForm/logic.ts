import { zodResolver } from '@hookform/resolvers/zod';
import { useState, type FormEvent } from 'react';
import { useForm } from 'react-hook-form';

import { getErrorMessageKey } from 'api/http';
import { useToast } from 'components/Toast';
import { applyServerFieldErrors } from 'forms';
import type { I18nKey } from 'i18n';
import { useI18n } from 'i18n/provider';
import { runDetached } from 'utils/async';

import {
  invoiceFormSchema,
  type InvoiceFormValues,
  type InvoiceInput,
} from '../../model';
import { useCreateInvoice } from '../../queries';

const emptyValues: InvoiceFormValues = { name: '', amount: null };

/**
 * New-invoice form: client validation (Zod codes), server validation (422
 * field codes next to the fields), other failures as a form-level message.
 * Input is never cleared on failure, so submitting again retries.
 */
export const useInvoiceForm = () => {
  const { t } = useI18n();
  const { showToast } = useToast();
  const create = useCreateInvoice();
  const [formErrorKey, setFormErrorKey] = useState<I18nKey | null>(null);
  const form = useForm<InvoiceFormValues, unknown, InvoiceInput>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: emptyValues,
  });

  const submit = form.handleSubmit(async (input) => {
    setFormErrorKey(null);
    try {
      await create.mutateAsync(input);
      form.reset(emptyValues);
      showToast({ title: t('invoices.form.created') });
    } catch (error) {
      const applied = applyServerFieldErrors(error, form.setError, [
        'name',
        'amount',
      ]);
      setFormErrorKey(
        applied ? 'forms.errors.summary' : getErrorMessageKey(error),
      );
    }
  });

  return {
    form,
    formErrorKey,
    isSaving: create.isPending,
    onSubmit: (event: FormEvent<HTMLFormElement>) => runDetached(submit(event)),
  };
};
