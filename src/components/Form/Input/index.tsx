import { Control } from '../common/Control';

import { useInputLogic } from './logic';
import type { InputProps } from './types';

export const Input = ({
  ref,
  controlSize = 'medium',
  status = 'default',
  startAdornment,
  endAdornment,
  valueSuffix,
  className,
  dataTestId,
  // Logic props (never forwarded to the DOM directly)
  id,
  type,
  inputMode,
  value,
  onChange,
  onClick,
  onPointerDown,
  onBlur,
  placeholder,
  disabled,
  format,
  currency,
  maximumFractionDigits,
  useGrouping,
  onValueChange,
  placeholderNumber,
  ...nativeProps
}: InputProps) => {
  const { fieldProps } = useInputLogic(
    {
      id,
      type,
      inputMode,
      value,
      onChange,
      onClick,
      onPointerDown,
      onBlur,
      placeholder,
      disabled,
      format,
      currency,
      maximumFractionDigits,
      useGrouping,
      onValueChange,
      placeholderNumber,
    },
    ref,
  );

  return (
    <Control
      size={controlSize}
      status={status}
      disabled={!!disabled}
      data-testid={dataTestId}
      className={className}
    >
      {startAdornment ? (
        <Control.Adornment $position="start">
          {startAdornment}
        </Control.Adornment>
      ) : null}

      <Control.Field as="input" {...nativeProps} {...fieldProps} />

      {valueSuffix ? <Control.Suffix>{valueSuffix}</Control.Suffix> : null}

      {endAdornment ? (
        <Control.Adornment $position="end">{endAdornment}</Control.Adornment>
      ) : null}
    </Control>
  );
};

Input.displayName = 'Input';
