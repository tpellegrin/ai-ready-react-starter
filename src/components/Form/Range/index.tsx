import React, { useCallback, useId, useMemo, useRef } from 'react';

import { Text } from 'components/Text';
import type { Props as TextProps } from 'components/Text/types';
import { Control } from '../common/Control';

import {
  _RangeRoot,
  _RangeTrack,
  _RangeThumb,
  _RangeThumbContent,
  _RangeMinMaxFootnote,
} from './styles';
import type { Props } from './types';
import { usePointerRangeLogic } from './logic';

export const Range: React.FC<Props> = ({
  min = 0,
  max = 100,
  value,
  step = 1,
  minLabel,
  maxLabel,
  onValueChange,
  onValueCommit,
  disabled,
  readOnly,
  isLoading,
  startAdornment,
  endAdornment,
  variant = 'flat',
  type = 'money',
  id: idProp,
  locale,
  currency,
  controlSize = 'medium',
  status = 'default',
  className,
  'aria-describedby': ariaDescribedBy,
  'aria-labelledby': ariaLabelledBy,
  ...restInputProps
}) => {
  const safeMin = Number.isFinite(min) ? Number(min) : 0;
  const safeMax = Number.isFinite(max) ? Number(max) : 100;
  const [mMin, mMax] = safeMin < safeMax ? [safeMin, safeMax] : [0, 100];
  const sStep = step && step > 0 ? step : 1;
  const size = controlSize;
  const hasError = status === 'error';
  const reactId = useId();
  const name = (restInputProps as { name?: string }).name;
  const id = idProp ?? `${name ?? 'range'}-${reactId}`;
  const footnoteId = `${id}-footnote`;
  const isVisuallyDisabled = !!disabled || !!isLoading;

  const dir = typeof document !== 'undefined' ? document.dir : 'ltr';
  const isRtl = dir === 'rtl';

  const numberFormatter = useMemo(() => {
    if (type === 'percentage')
      return new Intl.NumberFormat(undefined, {
        style: 'percent',
        maximumFractionDigits: 0,
      });
    if (type === 'money' && locale && currency) {
      try {
        return new Intl.NumberFormat(locale, {
          style: 'currency',
          currency,
          maximumFractionDigits: 0,
        });
      } catch {}
    }
    return new Intl.NumberFormat();
  }, [type, locale, currency]);

  const getFormattedValue = useCallback(
    (val: number): string => {
      if (type === 'percentage') return `${val}%`;
      if (type === 'money' && numberFormatter)
        return numberFormatter.format(val);
      return String(val);
    },
    [type, numberFormatter],
  );

  const getLabel = useCallback(
    (val: number, label?: string) =>
      label ? `${label} (${getFormattedValue(val)})` : getFormattedValue(val),
    [getFormattedValue],
  );

  const {
    inputRef,
    trackRef,
    isDragging,
    sliderPct,
    handlePointerDown,
    handleNativeChange,
    handleNativeKeyDown,
    handleNativeBlur,
  } = usePointerRangeLogic({
    min: mMin,
    max: mMax,
    value,
    step: sStep,
    onValueChange,
    onValueCommit,
    isRtl,
  });

  // focus proxy for clicking Control chrome
  const fieldRef = useRef<HTMLInputElement | null>(null);
  if (!inputRef.current) inputRef.current = fieldRef.current;

  const handleRootClick: React.MouseEventHandler<
    HTMLLabelElement | HTMLDivElement
  > = useCallback(
    (e) => {
      if (readOnly || isVisuallyDisabled) {
        e.preventDefault();
        return;
      }
      fieldRef.current?.focus();
    },
    [readOnly, isVisuallyDisabled],
  );

  const textVariant: TextProps['variant'] =
    size === 'small' ? 'captionMd' : 'bodyMd';

  return (
    <div style={{ width: '100%' }}>
      <Control
        size={size}
        status={status}
        disabled={isVisuallyDisabled}
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
          as="input"
          type="range"
          $visuallyHidden
          ref={fieldRef}
          id={id}
          name={name}
          min={mMin}
          max={mMax}
          step={sStep}
          value={value}
          disabled={isVisuallyDisabled}
          readOnly={readOnly}
          aria-invalid={hasError || undefined}
          aria-valuemin={mMin}
          aria-valuemax={mMax}
          aria-valuenow={value}
          aria-valuetext={getFormattedValue(value)}
          aria-describedby={ariaDescribedBy ?? footnoteId}
          aria-labelledby={ariaLabelledBy}
          aria-orientation="horizontal"
          aria-readonly={readOnly || undefined}
          aria-disabled={isVisuallyDisabled || undefined}
          onChange={handleNativeChange}
          onKeyDown={handleNativeKeyDown}
          onBlur={handleNativeBlur}
          {...restInputProps}
        />

        <_RangeRoot
          data-size={size}
          data-variant={variant}
          data-disabled={isVisuallyDisabled ? 'true' : 'false'}
          data-dragging={isDragging ? 'true' : 'false'}
          $variant={variant}
        >
          <_RangeTrack ref={trackRef} onPointerDown={handlePointerDown}>
            <_RangeThumb style={{ left: `${sliderPct}%` }}>
              <_RangeThumbContent />
            </_RangeThumb>
          </_RangeTrack>
        </_RangeRoot>

        {endAdornment && (
          <Control.Adornment position="end">{endAdornment}</Control.Adornment>
        )}
      </Control>

      <_RangeMinMaxFootnote id={footnoteId}>
        <Text color="tertiary" variant={textVariant}>
          {getLabel(mMin, minLabel)}
        </Text>
        <Text color="tertiary" variant={textVariant}>
          {getLabel(mMax, maxLabel)}
        </Text>
      </_RangeMinMaxFootnote>
    </div>
  );
};

Range.displayName = 'Range';
