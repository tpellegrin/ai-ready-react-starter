import { useEffect, useMemo, useRef, useState } from 'react';
import type React from 'react';

import { getLocale } from 'i18n';
import { useI18n } from 'i18n/provider';
import {
  formatTypedNumber,
  formatWithIntl,
  parseLocaleNumber,
  parseTypedNumber,
  type TypedNumber,
} from 'i18n/numberFormat';
import {
  countDigitsBefore,
  indexFromDigitCount,
  getDecimalIndex,
  countIntegerDigitsBefore,
  indexFromIntegerDigitCount,
  countFractionDigitsBefore,
  indexFromFractionDigitCount,
  clampCaretToNumericStart,
  getEffectiveMaxFractionDigits,
} from './utils';

import { assignRef } from 'utils/react';

import type { InputLogicProps } from './types';

export type UseInputLogicResult = {
  fieldProps: Pick<
    React.InputHTMLAttributes<HTMLInputElement>,
    | 'id'
    | 'disabled'
    | 'type'
    | 'inputMode'
    | 'value'
    | 'onChange'
    | 'onCompositionStart'
    | 'onCompositionEnd'
    | 'onPointerDown'
    | 'onClick'
    | 'onBlur'
    | 'placeholder'
  > & { ref: (node: HTMLInputElement | null) => void };
};

/**
 * Encapsulates all formatting, caret, and IME logic for the Input component.
 * Keeps Input/index.tsx lean and focused on rendering only.
 */
export const useInputLogic = (
  props: InputLogicProps,
  forwardedRef: React.Ref<HTMLInputElement> | undefined,
): UseInputLogicResult => {
  const {
    id,
    disabled,
    format,
    currency,
    maximumFractionDigits,
    useGrouping,
    onValueChange,
    placeholderNumber,
    type,
    inputMode,
    value,
    onChange,
    placeholder,
    onPointerDown: onPointerDownProp,
    onClick: onClickProp,
    onBlur: onBlurProp,
  } = props;

  const { lang } = useI18n();
  const locale = lang ?? getLocale();
  const formattingEnabled = !!format;

  // Precompute effective fraction digits and whether decimals are expected
  const effectiveMaxFrac = useMemo(
    () => getEffectiveMaxFractionDigits(format, maximumFractionDigits),
    [format, maximumFractionDigits],
  );
  const decimalsExpected = effectiveMaxFrac > 0;

  const inputRef = useRef<HTMLInputElement | null>(null);
  const composingRef = useRef(false);
  // The value this field last reported, and the in-progress decimal input
  // behind it ("1.", "1.50"). When the parent echoes that value back, the
  // display already shows it: don't reformat (that would erase "1.").
  const emittedRef = useRef<number | null | undefined>(undefined);
  const typedRef = useRef<TypedNumber | null>(null);
  // The formatting the display was produced with. When it changes (locale,
  // currency, grouping, precision), the display is re-rendered even for an
  // echoed value, so later edits are parsed with the separators shown.
  const formatKey = [
    locale,
    format,
    currency,
    maximumFractionDigits,
    useGrouping,
  ].join('|');
  const displayedWithRef = useRef(formatKey);
  const onValueChangeRef = useRef(onValueChange);
  useEffect(() => {
    onValueChangeRef.current = onValueChange;
  });
  const setRefs = (node: HTMLInputElement | null) => {
    inputRef.current = node;
    assignRef(forwardedRef, node);
  };

  // Local display state when formatting is enabled
  const [display, setDisplay] = useState<string>(() => {
    if (!formattingEnabled) return '';
    if (typeof value === 'number' && Number.isFinite(value)) {
      return formatWithIntl(value, {
        locale,
        format,
        currency,
        maximumFractionDigits,
        useGrouping,
      });
    }
    return '';
  });

  // Keep the display in sync with the external value and the formatting.
  useEffect(() => {
    if (!formattingEnabled) return;
    const formatChanged = displayedWithRef.current !== formatKey;
    displayedWithRef.current = formatKey;
    const echoed =
      emittedRef.current !== undefined && value === emittedRef.current;
    if (echoed && !formatChanged) return;

    // Same in-progress input, new separators or grouping ("1.234," in pt-BR).
    const typed = typedRef.current;
    if (
      echoed &&
      typed &&
      typeof value === 'number' &&
      typed.value === value &&
      format === 'number' &&
      typed.fractionDigits <= effectiveMaxFrac &&
      decimalsExpected
    ) {
      setDisplay(
        formatTypedNumber(
          { ...typed, value },
          { locale, maximumFractionDigits: effectiveMaxFrac, useGrouping },
        ),
      );
      return;
    }

    emittedRef.current = undefined;
    typedRef.current = null;
    if (typeof value === 'number' && Number.isFinite(value)) {
      const next = formatWithIntl(value, {
        locale,
        format,
        currency,
        maximumFractionDigits,
        useGrouping,
      });
      setDisplay(next);
      // New formatting may not show the value exactly (fewer fraction
      // digits): report what the field now displays, so the value and the
      // display never disagree.
      const shown = formatChanged ? parseLocaleNumber(next, locale) : value;
      if (shown !== null && shown !== value) {
        emittedRef.current = shown;
        onValueChangeRef.current?.(shown);
      }
    } else if (value === '' || value === undefined || value === null) {
      setDisplay('');
    }
  }, [
    value,
    formattingEnabled,
    formatKey,
    locale,
    format,
    currency,
    maximumFractionDigits,
    useGrouping,
    effectiveMaxFrac,
    decimalsExpected,
  ]);

  // Change handler that parses and re-formats as user types
  const handleChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    if (!formattingEnabled) {
      onChange?.(e);
      return;
    }

    const raw = e.target.value;

    // If composing (IME), don't parse/format; just mirror
    if (composingRef.current) {
      setDisplay(raw);
      return;
    }

    const el = inputRef.current;
    const caretBefore = el?.selectionStart ?? raw.length;
    const digitsLeftOfCaret = countDigitsBefore(raw, caretBefore);

    // Determine caret region (integer vs fraction) based on current raw text
    const decIdxRaw = decimalsExpected ? getDecimalIndex(raw, locale) : -1;
    const inInteger =
      decimalsExpected && decIdxRaw !== -1 ? caretBefore <= decIdxRaw : true;
    const intDigitsLeft =
      inInteger && decimalsExpected && decIdxRaw !== -1
        ? countIntegerDigitsBefore(raw, caretBefore, locale)
        : undefined;
    const fracDigitsLeft =
      !inInteger && decimalsExpected && decIdxRaw !== -1
        ? countFractionDigitsBefore(raw, caretBefore, locale)
        : undefined;

    // Decimal fields keep in-progress input ("1.", "1.50") while typing.
    const typed =
      format === 'number' && decimalsExpected
        ? parseTypedNumber(raw, locale, effectiveMaxFrac)
        : null;
    const parsed = typed ? typed.value : parseLocaleNumber(raw, locale);
    emittedRef.current = parsed;
    typedRef.current = typed;
    onValueChange?.(parsed);

    if (parsed === null) {
      setDisplay(raw);
      // Restore Caret to the same raw offset, but never before the first numeric digit
      requestAnimationFrame(() => {
        const n = inputRef.current;
        if (!n) return;
        const rawPos = Math.min(caretBefore, raw.length);
        const pos = clampCaretToNumericStart(raw, rawPos);
        n.setSelectionRange(pos, pos);
      });
      return;
    }

    const next = typed
      ? formatTypedNumber(
          { ...typed, value: parsed },
          { locale, maximumFractionDigits: effectiveMaxFrac, useGrouping },
        )
      : formatWithIntl(parsed, {
          locale,
          format,
          currency,
          maximumFractionDigits,
          useGrouping,
        });
    setDisplay(next);

    // Restore caret, preserving the integer/fraction region when applicable
    requestAnimationFrame(() => {
      const n = inputRef.current;
      if (!n) return;
      let pos: number;
      if (decimalsExpected) {
        const decNext = getDecimalIndex(next, locale);
        if (inInteger) {
          pos =
            decNext !== -1 && typeof intDigitsLeft === 'number'
              ? indexFromIntegerDigitCount(next, intDigitsLeft, locale)
              : indexFromDigitCount(next, digitsLeftOfCaret);
        } else {
          pos =
            decNext !== -1 && typeof fracDigitsLeft === 'number'
              ? indexFromFractionDigitCount(next, fracDigitsLeft, locale)
              : indexFromDigitCount(next, digitsLeftOfCaret);
        }
      } else {
        // No decimals expected; use digit-based mapping
        pos = indexFromDigitCount(next, digitsLeftOfCaret);
      }
      const clamped = clampCaretToNumericStart(next, pos);
      n.setSelectionRange(clamped, clamped);
    });
  };

  const effectivePlaceholder = useMemo(() => {
    if (!formattingEnabled || placeholderNumber === undefined)
      return placeholder;
    return formatWithIntl(placeholderNumber, {
      locale,
      format,
      currency,
      maximumFractionDigits,
      useGrouping,
    });
  }, [
    formattingEnabled,
    placeholderNumber,
    placeholder,
    locale,
    format,
    currency,
    maximumFractionDigits,
    useGrouping,
  ]);

  const handlePointerDown: React.PointerEventHandler<HTMLInputElement> = (
    e,
  ) => {
    // Call user handler first to allow preventDefault from callers if needed
    onPointerDownProp?.(e);
    if (!formattingEnabled || disabled || e.defaultPrevented) return;

    const n = inputRef.current ?? (e.currentTarget as HTMLInputElement);
    const isFocused = document.activeElement === n;

    // If not focused yet, override default caret placement to set caret at the end of the integer part
    if (!isFocused) {
      e.preventDefault();
      n.focus();
      const text = n.value;
      requestAnimationFrame(() => {
        // Default to end of string
        let targetPos: number | undefined;

        // Only try smart placement if we expect decimals
        if (text && decimalsExpected) {
          const parsed = parseLocaleNumber(text, locale);
          if (parsed !== null && Number.isFinite(parsed)) {
            const intDigits = Math.trunc(Math.abs(parsed)).toString().length;
            targetPos = indexFromDigitCount(text, intDigits);
          }
        }

        const unclamped = targetPos ?? text.length;
        const pos = clampCaretToNumericStart(text, unclamped);
        n.setSelectionRange(pos, pos);
      });
    }
    // If already focused, allow default behavior so users can select text or click to position caret
  };

  // Leaving the field settles in-progress input ("1." → "1").
  const handleBlur: React.FocusEventHandler<HTMLInputElement> = (event) => {
    typedRef.current = null;
    if (
      formattingEnabled &&
      typeof value === 'number' &&
      Number.isFinite(value)
    ) {
      setDisplay(
        formatWithIntl(value, {
          locale,
          format,
          currency,
          maximumFractionDigits,
          useGrouping,
        }),
      );
    }
    onBlurProp?.(event);
  };

  const handleClick: React.MouseEventHandler<HTMLInputElement> = (event) => {
    onClickProp?.(event);
    if (!format || event.defaultPrevented) return;
    const n = inputRef.current;
    if (!n) return;
    // Defer until after Browser sets selection based on click
    requestAnimationFrame(() => {
      const node = inputRef.current;
      if (!node) return;
      const start = node.selectionStart ?? 0;
      const end = node.selectionEnd ?? 0;
      // Only adjust collapsed carets (not ranges) to preserve text selection behavior
      if (start === end) {
        const clamped = clampCaretToNumericStart(node.value, start);
        if (clamped !== start) node.setSelectionRange(clamped, clamped);
      }
    });
  };

  return {
    fieldProps: {
      id,
      ref: setRefs,
      type: formattingEnabled ? 'text' : type,
      inputMode: formattingEnabled ? (inputMode ?? 'decimal') : inputMode,
      value: formattingEnabled ? display : value === null ? '' : value,
      onChange: handleChange,
      onCompositionStart: () => (composingRef.current = true),
      onCompositionEnd: () => (composingRef.current = false),
      onPointerDown: handlePointerDown,
      onClick: handleClick,
      onBlur: handleBlur,
      placeholder: effectivePlaceholder,
    },
  };
};
