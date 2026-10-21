import { useId } from 'react';

import {
  _FieldDescription,
  _FieldError,
  _FieldLabel,
  _FieldRequiredMark,
  _FieldRoot,
} from './styles';
import type { FieldControlProps, Props } from './types';

/**
 * Labelled form field for any native control (Input, Select, Textarea, or a
 * custom one). It owns the ids and ARIA wiring; the form library (or plain
 * state) owns values and validation.
 *
 * ```tsx
 * <Field label={t('…')} error={message} required>
 *   {(control) => <Input {...control} {...register('name')} />}
 * </Field>
 * ```
 */
export const Field = ({
  label,
  description,
  error,
  required = false,
  id,
  className,
  children,
}: Props) => {
  const generatedId = useId();
  const controlId = id ?? `field-${generatedId}`;
  const descriptionId = description ? `${controlId}-description` : undefined;
  const errorId = error ? `${controlId}-error` : undefined;
  const describedBy =
    [descriptionId, errorId].filter(Boolean).join(' ') || undefined;

  const control: FieldControlProps = {
    id: controlId,
    'aria-describedby': describedBy,
    'aria-invalid': error ? true : undefined,
    'aria-required': required ? true : undefined,
  };

  return (
    <_FieldRoot className={className}>
      <_FieldLabel htmlFor={controlId}>
        {label}
        {required ? (
          <_FieldRequiredMark aria-hidden="true">*</_FieldRequiredMark>
        ) : null}
      </_FieldLabel>
      {description ? (
        <_FieldDescription id={descriptionId}>{description}</_FieldDescription>
      ) : null}
      {children(control)}
      {error ? <_FieldError id={errorId}>{error}</_FieldError> : null}
    </_FieldRoot>
  );
};

export type { FieldControlProps, Props as FieldProps } from './types';
