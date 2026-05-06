import { forwardRef, useMemo } from 'react';

import { Control } from '../common/Control';
import type { TextareaProps } from './types';

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      controlSize = 'medium',
      status = 'default',
      disabled,
      startAdornment,
      endAdornment,
      className,
      dataTestId,
      id,
      rows = 3,
      'aria-describedby': ariaDescribedBy,
      'aria-labelledby': ariaLabelledBy,
      ...textareaProps
    },
    ref,
  ) => {
    const ariaInvalid = useMemo(
      () => (status === 'error' ? true : undefined),
      [status],
    );

    return (
      <Control
        size={controlSize}
        status={status}
        disabled={!!disabled}
        data-testid={dataTestId}
        className={className}
        alignStart
      >
        {startAdornment && (
          <Control.Adornment position="start">
            {startAdornment}
          </Control.Adornment>
        )}

        <Control.Field
          as="textarea"
          id={id}
          ref={ref}
          disabled={disabled}
          aria-invalid={ariaInvalid}
          aria-describedby={ariaDescribedBy}
          aria-labelledby={ariaLabelledBy}
          rows={rows}
          {...textareaProps}
        />

        {endAdornment && (
          <Control.Adornment position="end">{endAdornment}</Control.Adornment>
        )}
      </Control>
    );
  },
);

Textarea.displayName = 'Textarea';
