import { useId } from 'react';
import { Controller } from 'react-hook-form';

import { Button } from 'components/Button';
import { Dialog } from 'components/Dialog';
import { Field } from 'components/Form/Field';
import { Input } from 'components/Form/Input';
import { Select } from 'components/Form/Select';
import { InlineAlert } from 'components/InlineAlert';
import { useFieldErrorMessage } from 'forms';
import { useI18n } from 'i18n/provider';

import { EXPENSE_CATEGORIES, EXPENSE_CURRENCY } from '../../model';

import { useAddExpenseDialog } from './logic';
import { _AddExpenseDialogForm } from './styles';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * Adds an expense in a dialog. Focus starts in Description and returns to
 * the button that opened it; a saved expense closes the dialog and shows a
 * toast once the list and totals are fresh.
 */
export const AddExpenseDialog = ({ open, onOpenChange }: Props) => {
  const { t } = useI18n();
  const fieldError = useFieldErrorMessage();
  const formId = useId();
  const { form, formErrorKey, isSaving, handleOpenChange, onSubmit } =
    useAddExpenseDialog({ onOpenChange });
  const { errors } = form.formState;

  return (
    <Dialog
      open={open}
      onOpenChange={handleOpenChange}
      title={t('expenses.form.title')}
      footer={
        <>
          <Button
            isCompact
            variant="secondary"
            label={t('common.actions.cancel')}
            onClick={() => handleOpenChange(false)}
          />
          <Button
            isCompact
            type="submit"
            form={formId}
            label={t('expenses.form.save')}
            isPending={isSaving}
            pendingLabel={t('common.status.saving')}
          />
        </>
      }
    >
      <_AddExpenseDialogForm id={formId} noValidate onSubmit={onSubmit}>
        {formErrorKey ? (
          <InlineAlert tone="error">{t(formErrorKey)}</InlineAlert>
        ) : null}
        <Field
          label={t('expenses.form.description')}
          error={fieldError(errors.description)}
          required
        >
          {(control) => (
            <Input
              {...control}
              {...form.register('description')}
              autoComplete="off"
            />
          )}
        </Field>
        {/* Numeric control: Input reports number | null through onValueChange. */}
        <Controller
          control={form.control}
          name="amount"
          render={({ field, fieldState }) => (
            <Field
              label={t('expenses.form.amount')}
              error={fieldError(fieldState.error)}
              required
            >
              {(control) => (
                <Input
                  {...control}
                  ref={field.ref}
                  name={field.name}
                  format="currency"
                  currency={EXPENSE_CURRENCY}
                  placeholderNumber={0}
                  value={field.value}
                  onValueChange={field.onChange}
                  onBlur={field.onBlur}
                />
              )}
            </Field>
          )}
        />
        <Field
          label={t('expenses.form.category')}
          error={fieldError(errors.category)}
          required
        >
          {(control) => (
            <Select
              {...control}
              {...form.register('category')}
              options={EXPENSE_CATEGORIES.map((category) => ({
                value: category,
                label: t(`expenses.category.${category}`),
              }))}
            />
          )}
        </Field>
      </_AddExpenseDialogForm>
    </Dialog>
  );
};
