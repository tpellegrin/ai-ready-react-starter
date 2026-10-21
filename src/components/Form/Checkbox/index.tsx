import { useId } from 'react';

import {
  _CheckboxHint,
  _CheckboxInput,
  _CheckboxLabel,
  _CheckboxRoot,
  _CheckboxText,
} from './styles';
import type { Props } from './types';

/**
 * Native checkbox with a visible label. Works uncontrolled (React Hook Form
 * `register`) or controlled (`checked` + `onChange`).
 */
export const Checkbox = ({
  label,
  description,
  error,
  id,
  'aria-describedby': describedByProp,
  ...inputProps
}: Props) => {
  const generatedId = useId();
  const inputId = id ?? `checkbox-${generatedId}`;
  const descriptionId = description ? `${inputId}-description` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy =
    [describedByProp, descriptionId, errorId].filter(Boolean).join(' ') ||
    undefined;

  return (
    <_CheckboxRoot>
      <_CheckboxInput
        {...inputProps}
        id={inputId}
        type="checkbox"
        aria-describedby={describedBy}
        aria-invalid={error ? true : undefined}
      />
      <_CheckboxText>
        <_CheckboxLabel htmlFor={inputId}>{label}</_CheckboxLabel>
        {description ? (
          <_CheckboxHint id={descriptionId}>{description}</_CheckboxHint>
        ) : null}
        {error ? (
          <_CheckboxHint id={errorId} $isError>
            {error}
          </_CheckboxHint>
        ) : null}
      </_CheckboxText>
    </_CheckboxRoot>
  );
};

export type { Props as CheckboxProps } from './types';
