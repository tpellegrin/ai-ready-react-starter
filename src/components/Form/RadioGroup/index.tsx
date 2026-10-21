import { useId } from 'react';

import {
  _RadioGroupHint,
  _RadioGroupInput,
  _RadioGroupLegend,
  _RadioGroupOption,
  _RadioGroupOptionLabel,
  _RadioGroupOptionText,
  _RadioGroupRequiredMark,
  _RadioGroupRoot,
} from './styles';
import type { Props } from './types';

/**
 * Native radio buttons in a fieldset/legend. Arrow keys move between options
 * (browser behavior); Tab enters and leaves the group.
 */
export const RadioGroup = <TValue extends string>({
  legend,
  name,
  options,
  value,
  onChange,
  onBlur,
  description,
  error,
  required = false,
  disabled = false,
  ref,
}: Props<TValue>) => {
  const groupId = `radio-group-${useId()}`;
  const descriptionId = description ? `${groupId}-description` : undefined;
  const errorId = error ? `${groupId}-error` : undefined;
  const focusTarget =
    options.find((option) => option.value === value)?.value ??
    options[0]?.value;

  return (
    <_RadioGroupRoot
      role="radiogroup"
      aria-describedby={
        [descriptionId, errorId].filter(Boolean).join(' ') || undefined
      }
      aria-invalid={error ? true : undefined}
      aria-required={required ? true : undefined}
      disabled={disabled}
    >
      <_RadioGroupLegend>
        {legend}
        {required ? (
          <_RadioGroupRequiredMark aria-hidden="true">
            *
          </_RadioGroupRequiredMark>
        ) : null}
      </_RadioGroupLegend>
      {description ? (
        <_RadioGroupHint id={descriptionId}>{description}</_RadioGroupHint>
      ) : null}
      {options.map((option, index) => {
        const inputId = `${groupId}-option-${index}`;
        const hintId = option.description ? `${inputId}-hint` : undefined;
        return (
          <_RadioGroupOption key={option.value}>
            <_RadioGroupInput
              ref={option.value === focusTarget ? ref : undefined}
              id={inputId}
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              disabled={option.disabled}
              aria-describedby={hintId}
              onChange={() => onChange(option.value)}
              onBlur={onBlur}
            />
            <_RadioGroupOptionText>
              <_RadioGroupOptionLabel htmlFor={inputId}>
                {option.label}
              </_RadioGroupOptionLabel>
              {option.description ? (
                <_RadioGroupHint id={hintId}>
                  {option.description}
                </_RadioGroupHint>
              ) : null}
            </_RadioGroupOptionText>
          </_RadioGroupOption>
        );
      })}
      {error ? (
        <_RadioGroupHint id={errorId} $isError>
          {error}
        </_RadioGroupHint>
      ) : null}
    </_RadioGroupRoot>
  );
};

export type { Props as RadioGroupProps, RadioOption } from './types';
