import { Controller } from 'react-hook-form';

import { Button } from 'components/Button';
import { Checkbox } from 'components/Form/Checkbox';
import { Field } from 'components/Form/Field';
import { Input } from 'components/Form/Input';
import { RadioGroup } from 'components/Form/RadioGroup';
import { Select } from 'components/Form/Select';
import { Textarea } from 'components/Form/Textarea';
import { InlineAlert } from 'components/InlineAlert';
import { useFieldErrorMessage } from 'forms';
import { useI18n } from 'i18n/provider';

import {
  RESOURCE_CATEGORIES,
  RESOURCE_STATUSES,
  type Resource,
} from '../../model';

import { useResourceForm } from './logic';
import { _ResourceFormActions, _ResourceFormRoot } from './styles';

type Props = {
  /** Resource to edit; omit to create. */
  resource?: Resource | undefined;
  onSaved: (saved: Resource) => void;
  onCancel: () => void;
};

export const ResourceForm = ({ resource, onSaved, onCancel }: Props) => {
  const { t } = useI18n();
  const fieldError = useFieldErrorMessage();
  const { form, formErrorKey, isSaving, onSubmit } = useResourceForm({
    resource,
    onSaved,
  });
  const { errors } = form.formState;

  return (
    <_ResourceFormRoot noValidate onSubmit={onSubmit}>
      {formErrorKey ? (
        <InlineAlert tone="error">{t(formErrorKey)}</InlineAlert>
      ) : null}

      <Field
        label={t('resources.form.name')}
        description={t('resources.form.nameHint')}
        error={fieldError(errors.name)}
        required
      >
        {(control) => (
          <Input {...control} {...form.register('name')} autoComplete="off" />
        )}
      </Field>

      <Field
        label={t('resources.form.description')}
        description={t('resources.form.descriptionHint')}
        error={fieldError(errors.description)}
      >
        {(control) => (
          <Textarea {...control} {...form.register('description')} />
        )}
      </Field>

      <Field
        label={t('resources.form.category')}
        error={fieldError(errors.category)}
        required
      >
        {(control) => (
          <Select
            {...control}
            {...form.register('category')}
            options={RESOURCE_CATEGORIES.map((category) => ({
              value: category,
              label: t(`resources.item.category.${category}`),
            }))}
          />
        )}
      </Field>

      {/* Numeric control: Input reports number | null through onValueChange;
          Controller stores exactly that (no synthetic change events). */}
      <Controller
        control={form.control}
        name="quantity"
        render={({ field, fieldState }) => (
          <Field
            label={t('resources.form.quantity')}
            description={t('resources.form.quantityHint')}
            error={fieldError(fieldState.error)}
            required
          >
            {(control) => (
              <Input
                {...control}
                ref={field.ref}
                name={field.name}
                format="number"
                inputMode="numeric"
                maximumFractionDigits={0}
                value={field.value}
                onValueChange={field.onChange}
                onBlur={field.onBlur}
              />
            )}
          </Field>
        )}
      />

      <Controller
        control={form.control}
        name="status"
        render={({ field, fieldState }) => (
          <RadioGroup
            ref={field.ref}
            legend={t('resources.form.status')}
            name={field.name}
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            error={fieldError(fieldState.error)}
            required
            options={RESOURCE_STATUSES.map((status) => ({
              value: status,
              label: t(`resources.item.status.${status}`),
            }))}
          />
        )}
      />

      <Checkbox
        {...form.register('featured')}
        label={t('resources.form.featured')}
        description={t('resources.form.featuredHint')}
        error={fieldError(errors.featured)}
      />

      <_ResourceFormActions>
        <Button
          isCompact
          variant="secondary"
          label={t('common.actions.cancel')}
          onClick={onCancel}
        />
        <Button
          isCompact
          type="submit"
          label={t('resources.actions.save')}
          isPending={isSaving}
          pendingLabel={t('common.status.saving')}
        />
      </_ResourceFormActions>
    </_ResourceFormRoot>
  );
};
