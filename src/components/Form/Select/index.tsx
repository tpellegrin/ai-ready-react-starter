import {
  forwardRef,
  useCallback,
  useMemo,
  useRef,
  useImperativeHandle,
} from 'react';

import { useI18n } from 'i18n/provider';

import { Control } from '../common/Control';
import type { SelectProps, SelectOption } from './types';

/**
 * showPicker() needs a user gesture and throws when it is missing, when the
 * page is in a cross-origin frame, or when unsupported. Focus is then enough:
 * the keyboard or a direct click opens the native picker.
 */
const openPicker = (select: HTMLSelectElement) => {
  try {
    select.showPicker();
  } catch {
    // Not allowed here; the select stays focused.
  }
};

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
      ...selectProps
    },
    ref,
  ) => {
    const { t } = useI18n();
    const fieldRef = useRef<HTMLSelectElement | null>(null);
    useImperativeHandle(ref, () => fieldRef.current as HTMLSelectElement);

    const ariaInvalid = useMemo(
      () => (status === 'error' ? true : undefined),
      [status],
    );

    const isVisuallyDisabled = !!disabled || !!isLoading;

    // Clicking the chrome around the select (padding, adornments) opens the
    // native picker. Clicks on the select itself keep native behaviour.
    const handleRootClick: React.MouseEventHandler<HTMLDivElement> =
      useCallback(
        (e) => {
          const field = fieldRef.current;
          if (!field || e.target === field) return;
          if (readOnly || isVisuallyDisabled) return;
          field.focus();
          openPicker(field);
        },
        [readOnly, isVisuallyDisabled],
      );

    const handleMouseDown: React.MouseEventHandler<HTMLSelectElement> =
      useCallback(
        (e) => {
          // A select has no native read-only state: block the picker.
          if (readOnly) e.preventDefault();
        },
        [readOnly],
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
          <Control.Adornment $position="start">
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
          {...selectProps}
        >
          {isLoading && (
            <option value="" disabled>
              {t('common.status.loading')}
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
          <Control.Adornment $position="end">{endAdornment}</Control.Adornment>
        )}
      </Control>
    );
  },
);

Select.displayName = 'Select';
