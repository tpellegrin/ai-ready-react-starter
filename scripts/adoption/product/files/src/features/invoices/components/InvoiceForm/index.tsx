import { Controller } from 'react-hook-form';

import { Button } from 'components/Button';
import { Field } from 'components/Form/Field';
import { Input } from 'components/Form/Input';
import { InlineAlert } from 'components/InlineAlert';
import { Text } from 'components/Text';
import { useFieldErrorMessage } from 'forms';
import { useI18n } from 'i18n/provider';

import { useInvoiceForm } from './logic';
import { _InvoiceFormFields, _InvoiceFormRoot } from './styles';

/** Creates an invoice; the list refreshes before success is shown. */
export const InvoiceForm = () => {
  const { t } = useI18n();
  const fieldError = useFieldErrorMessage();
  const { form, formErrorKey, isSaving, onSubmit } = useInvoiceForm();
  const { errors } = form.formState;

  return (
    <_InvoiceFormRoot
      noValidate
      onSubmit={onSubmit}
      aria-label={t('invoices.form.title')}
    >
      <Text as="h2" variant="headingSm">
        {t('invoices.form.title')}
      </Text>
      <_InvoiceFormFields>
        <Field
          label={t('invoices.form.customer')}
          error={fieldError(errors.name)}
          required
        >
          {(control) => (
            <Input
              {...control}
              {...form.register('name')}
              autoComplete="organization"
            />
          )}
        </Field>
        {/* Numeric control: Input reports number | null through onValueChange. */}
        <Controller
          control={form.control}
          name="amount"
          render={({ field, fieldState }) => (
            <Field
              label={t('invoices.form.amount')}
              error={fieldError(fieldState.error)}
              required
            >
              {(control) => (
                <Input
                  {...control}
                  ref={field.ref}
                  name={field.name}
                  format="currency"
                  value={field.value}
                  onValueChange={field.onChange}
                  onBlur={field.onBlur}
                />
              )}
            </Field>
          )}
        />
      </_InvoiceFormFields>
      {formErrorKey ? (
        <InlineAlert tone="error">{t(formErrorKey)}</InlineAlert>
      ) : null}
      <Button
        type="submit"
        isCompact
        label={t('invoices.form.submit')}
        isPending={isSaving}
        pendingLabel={t('invoices.form.submitting')}
      />
    </_InvoiceFormRoot>
  );
};
