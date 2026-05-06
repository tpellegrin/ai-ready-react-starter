import { useEffect, useMemo, useRef, useState } from 'react';
import type React from 'react';

import { getLocale } from 'i18n';
import { useI18n } from 'i18n/provider';
import { formatWithIntl, parseLocaleNumber } from 'utils/numberFormat';
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

import type { InputProps } from './types';

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
    | 'placeholder'
  > & { ref: (node: HTMLInputElement | null) => void };
};

/**
 * Encapsulates all formatting, caret, and IME logic for the Input component.
 * Keeps Input/index.tsx lean and focused on rendering only.
 */
export const useInputLogic = (
  props: InputProps,
  forwardedRef: React.Ref<HTMLInputElement>,
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
  const setRefs = (node: HTMLInputElement | null) => {
    inputRef.current = node;
    if (typeof forwardedRef === 'function') forwardedRef(node);
    else if (
      forwardedRef &&
      typeof (forwardedRef as React.MutableRefObject<HTMLInputElement | null>)
        .current !== 'undefined'
    ) {
      (
        forwardedRef as React.MutableRefObject<HTMLInputElement | null>
      ).current = node;
    }
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

  // Keep the Display in sync with the external value
  useEffect(() => {
    if (!formattingEnabled) return;
    if (typeof value === 'number' && Number.isFinite(value)) {
      setDisplay(
        formatWithIntl(value, {
          locale,
          format,
          currency,
          maximumFractionDigits,
          useGrouping,
        }),
      );
    } else if (value === '' || value === undefined || value === null) {
      setDisplay('');
    }
  }, [
    value,
    formattingEnabled,
    locale,
    format,
    currency,
    maximumFractionDigits,
    useGrouping,
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

    const parsed = parseLocaleNumber(raw, locale);
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

    const next = formatWithIntl(parsed, {
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
        try {
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
        } catch {}
      });
    }
    // If already focused, allow default behavior so users can select text or click to position caret
  };

  const handleClick: React.MouseEventHandler<HTMLInputElement> = () => {
    if (!format) return; // refer to props.format directly to avoid stale closure
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
      value: formattingEnabled ? display : value,
      onChange: handleChange,
      onCompositionStart: () => (composingRef.current = true),
      onCompositionEnd: () => (composingRef.current = false),
      onPointerDown: handlePointerDown,
      onClick: handleClick,
      placeholder: effectivePlaceholder,
    },
  };
};
