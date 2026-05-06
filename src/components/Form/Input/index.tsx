import { forwardRef } from 'react';

import { Control } from '../common/Control';
import type { InputProps } from './types';
import { useInputLogic } from './logic';

export const Input = forwardRef<HTMLInputElement, InputProps>((props, ref) => {
  const {
    controlSize = 'medium',
    status = 'default',
    disabled,
    startAdornment,
    endAdornment,
    valueSuffix,
    className,
    dataTestId,
    'aria-describedby': ariaDescribedBy,
    'aria-labelledby': ariaLabelledBy,
    ...rest
  } = props;

  const { fieldProps } = useInputLogic(props, ref);

  return (
    <Control
      size={controlSize}
      status={status}
      disabled={!!disabled}
      data-testid={dataTestId}
      className={className}
    >
      {startAdornment && (
        <Control.Adornment position="start">{startAdornment}</Control.Adornment>
      )}

      <Control.Field
        as="input"
        aria-describedby={ariaDescribedBy}
        aria-labelledby={ariaLabelledBy}
        {...rest}
        {...fieldProps}
      />

      {valueSuffix && <Control.Suffix>{valueSuffix}</Control.Suffix>}

      {endAdornment && (
        <Control.Adornment position="end">{endAdornment}</Control.Adornment>
      )}
    </Control>
  );
});

Input.displayName = 'Input';
