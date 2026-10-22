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
  expenseFormSchema,
  type ExpenseFormValues,
  type ExpenseInput,
} from '../../model';
import { useCreateExpense } from '../../queries';

/** Category defaults to Meals (the sketch's note). */
export const emptyExpense: ExpenseFormValues = {
  description: '',
  amount: null,
  category: 'meals',
};

/**
 * New-expense form: client validation (Zod codes), server validation (422
 * field codes next to the fields), other failures as a form-level message.
 * Input is never cleared on failure, so saving again retries. Closing the
 * dialog (Cancel, Escape, the close button or a saved expense) resets the
 * form, so each opening starts empty.
 */
export const useAddExpenseDialog = ({
  onOpenChange,
}: {
  onOpenChange: (open: boolean) => void;
}) => {
  const { t } = useI18n();
  const { showToast } = useToast();
  const create = useCreateExpense();
  const [formErrorKey, setFormErrorKey] = useState<I18nKey | null>(null);
  const form = useForm<ExpenseFormValues, unknown, ExpenseInput>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: emptyExpense,
  });

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      form.reset(emptyExpense);
      setFormErrorKey(null);
    }
    onOpenChange(open);
  };

  const submit = form.handleSubmit(async (input) => {
    setFormErrorKey(null);
    try {
      await create.mutateAsync(input);
      showToast({ title: t('expenses.form.created') });
      handleOpenChange(false);
    } catch (error) {
      const applied = applyServerFieldErrors(error, form.setError, [
        'description',
        'amount',
        'category',
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
    handleOpenChange,
    onSubmit: (event: FormEvent<HTMLFormElement>) => runDetached(submit(event)),
  };
};
