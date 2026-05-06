import {
  forwardRef,
  useCallback,
  useMemo,
  useRef,
  useImperativeHandle,
} from 'react';

import { Control } from '../common/Control';
import type { SelectProps, SelectOption } from './types';

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      controlSize = 'medium',
      status = 'default',
      disabled,
      startAdornment,
      endAdornment,
      placeholder,
      isLoading,
      readOnly,
      className,
      dataTestId,
      id,
      value,
      defaultValue,
      options,
      'aria-describedby': ariaDescribedBy,
      'aria-labelledby': ariaLabelledBy,
      onFocus,
      ...selectProps
    },
    ref,
  ) => {
    const fieldRef = useRef<HTMLSelectElement | null>(null);
    useImperativeHandle(ref, () => fieldRef.current as HTMLSelectElement);

    const ariaInvalid = useMemo(
      () => (status === 'error' ? true : undefined),
      [status],
    );

    const isVisuallyDisabled = !!disabled || !!isLoading;

    const handleRootClick: React.MouseEventHandler<
      HTMLLabelElement | HTMLDivElement
    > = useCallback(
      (e) => {
        if (readOnly || isVisuallyDisabled) {
          e.preventDefault();
          return;
        }
        fieldRef.current?.click();
        (
          fieldRef.current as HTMLSelectElement & { showPicker?: () => void }
        )?.showPicker?.();
      },
      [readOnly, isVisuallyDisabled],
    );

    const handleMouseDown: React.MouseEventHandler<HTMLSelectElement> =
      useCallback(
        (e) => {
          if (readOnly) {
            e.preventDefault();
            return;
          }
          const target = e.currentTarget as HTMLSelectElement & {
            showPicker?: () => void;
          };
          if (typeof target.showPicker === 'function') {
            e.preventDefault();
          }
        },
        [readOnly],
      );

    const handleFocus = useCallback<React.FocusEventHandler<HTMLSelectElement>>(
      (e) => {
        onFocus?.(e);
        // Optionally, scroll into view
      },
      [onFocus],
    );

    const shouldShowPlaceholder = !!placeholder && !isLoading;
    const isControlled = value !== undefined;
    const effectiveDefaultValue = isControlled
      ? undefined
      : (defaultValue ?? (shouldShowPlaceholder ? '' : undefined));

    const renderOptions = (opts: SelectOption[]) =>
      opts.map((opt, i) => (
        <option
          key={`o-${i}`}
          value={String(opt.value)}
          disabled={opt.disabled}
        >
          {opt.label}
        </option>
      ));

    return (
      <Control
        size={controlSize}
        status={status}
        disabled={isVisuallyDisabled}
        data-testid={dataTestId}
        className={className}
        style={{ cursor: isVisuallyDisabled ? 'default' : 'pointer' }}
        onClick={handleRootClick}
      >
        {startAdornment && (
          <Control.Adornment position="start">
            {startAdornment}
          </Control.Adornment>
        )}

        <Control.Field
          as="select"
          id={id}
          ref={fieldRef}
          disabled={isVisuallyDisabled}
          aria-invalid={ariaInvalid}
          aria-describedby={ariaDescribedBy}
          aria-labelledby={ariaLabelledBy}
          aria-readonly={readOnly || undefined}
          value={value}
          defaultValue={effectiveDefaultValue}
          onMouseDown={handleMouseDown}
          onFocus={handleFocus}
          {...selectProps}
        >
          {isLoading && (
            <option value="" disabled>
              Loading…
            </option>
          )}
          {!isLoading && shouldShowPlaceholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {renderOptions(options)}
        </Control.Field>

        {endAdornment && (
          <Control.Adornment position="end">{endAdornment}</Control.Adornment>
        )}
      </Control>
    );
  },
);

Select.displayName = 'Select';
