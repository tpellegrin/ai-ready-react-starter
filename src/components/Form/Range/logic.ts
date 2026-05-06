import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useDisableBodyTextSelect } from 'hooks/useDisableBodyTextSelect';
import { IS_DESKTOP_WEB } from 'globals/platforms';

import type { LogicProps } from './types';

const clamp = (v: number, min: number, max: number) =>
  Math.min(Math.max(v, min), max);
const spanOrOne = (min: number, max: number) =>
  max - min === 0 ? 1 : max - min;

const valueToPercent = (value: number, min: number, max: number): number => {
  const span = spanOrOne(min, max);
  return ((value - min) / span) * 100;
};

const percentToValue = (percent: number, min: number, max: number): number => {
  const span = spanOrOne(min, max);
  return min + (percent / 100) * span;
};

const decimals = (n: number) => {
  if (!Number.isFinite(n)) return 0;
  const s = String(n);
  const i = s.indexOf('.');
  return i >= 0 ? s.length - i - 1 : 0;
};

export function usePointerRangeLogic({
  min,
  max,
  value,
  step,
  onValueChange,
  onValueCommit,
  isRtl,
}: LogicProps) {
  const sMin = Number.isFinite(min) ? min : 0;
  const sMax = Number.isFinite(max) && max > sMin ? max : sMin + 100;
  const sStep = step && step > 0 ? step : 1;
  const sValue = clamp(value, sMin, sMax);
  const trackRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [sliderPct, setSliderPct] = useState(
    valueToPercent(sValue, sMin, sMax),
  );
  const [wasTouched, setWasTouched] = useState(false);

  useEffect(() => {
    // sync percent on external changes
    setSliderPct(valueToPercent(clamp(value, sMin, sMax), sMin, sMax));
  }, [value, sMin, sMax]);

  const roundToStep = useMemo(() => {
    const dp = Math.max(decimals(sStep), 0);
    const factor = Math.pow(10, dp);
    return (raw: number) => {
      const steps = Math.round((raw - sMin) / sStep);
      const snapped = sMin + steps * sStep;
      return Math.round(snapped * factor) / factor;
    };
  }, [sMin, sStep]);

  const getPctFromClientX = useCallback(
    (clientX: number) => {
      const el = trackRef.current;
      if (!el) return 0;
      const { left, width } = el.getBoundingClientRect();
      if (width <= 0) return 0;
      const rel = (clientX - left) / width; // 0..1 LTR
      const pctLtr = Math.max(0, Math.min(rel, 1)) * 100; // 0..100
      return isRtl ? 100 - pctLtr : pctLtr;
    },
    [isRtl],
  );

  const commit = useCallback(
    (val: number) => {
      onValueCommit?.(val);
    },
    [onValueCommit],
  );

  const emit = useCallback(
    (val: number) => {
      onValueChange?.(val);
    },
    [onValueChange],
  );

  const updateFromPointer = useCallback(
    (clientX: number) => {
      const pct = getPctFromClientX(clientX);
      const raw = percentToValue(pct, sMin, sMax);
      const snapped = roundToStep(raw);
      const clamped = clamp(snapped, sMin, sMax);
      setSliderPct(valueToPercent(clamped, sMin, sMax));
      emit(clamped);
    },
    [getPctFromClientX, sMin, sMax, roundToStep, emit],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      // Only left-click / primary touch/pen
      if (e.button !== -1 && e.button !== 0) return;
      setWasTouched(true);
      // Ensure the hidden input is the active element from the start of the interaction
      // (keeps a11y context and :focus-within visuals consistent on mobile)
      try {
        inputRef.current?.focus({ preventScroll: true });
      } catch {
        // older browsers
        inputRef.current?.focus();
      }
      setIsDragging(true);
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      updateFromPointer(e.clientX);
    },
    [updateFromPointer],
  );

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      if (!isDragging) return;
      updateFromPointer(e.clientX);
    },
    [isDragging, updateFromPointer],
  );

  const handlePointerUp = useCallback(
    (_e: PointerEvent) => {
      if (!isDragging) return;
      setIsDragging(false);
      const val = clamp(
        roundToStep(percentToValue(sliderPct, sMin, sMax)),
        sMin,
        sMax,
      );
      commit(val);
    },
    [isDragging, sliderPct, sMin, sMax, roundToStep, commit],
  );

  // attach DOM-level listeners on the track only while captured
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const onMove = (e: PointerEvent) => handlePointerMove(e);
    const onUp = (e: PointerEvent) => handlePointerUp(e);
    if (isDragging) {
      el.addEventListener('pointermove', onMove);
      el.addEventListener('pointerup', onUp);
      el.addEventListener('pointercancel', onUp);
    }
    return () => {
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
    };
  }, [isDragging, handlePointerMove, handlePointerUp]);

  // Keep focus on the hidden input after drag ends (so :focus-within styles remain)
  useEffect(() => {
    // Fallback: if initial focus was blocked by the browser, try once after drag ends.
    if (
      wasTouched &&
      !isDragging &&
      document.activeElement !== inputRef.current
    ) {
      try {
        inputRef.current?.focus({ preventScroll: true });
      } catch {
        inputRef.current?.focus();
      }
    }
  }, [isDragging, wasTouched]);

  const handleNativeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const next = Number(e.target.value || 0);
      const snapped = roundToStep(next);
      const clamped = clamp(snapped, sMin, sMax);
      setSliderPct(valueToPercent(clamped, sMin, sMax));
      emit(clamped);
    },
    [roundToStep, sMin, sMax, emit],
  );

  const handleNativeKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        commit(clamp(roundToStep(value), sMin, sMax));
      }
    },
    [commit, roundToStep, value, sMin, sMax],
  );

  const handleNativeBlur = useCallback(() => {
    commit(clamp(roundToStep(value), sMin, sMax));
  }, [commit, roundToStep, value, sMin, sMax]);

  useDisableBodyTextSelect(isDragging, IS_DESKTOP_WEB);

  return {
    trackRef,
    inputRef,
    isDragging,
    sliderPct,
    handlePointerDown,
    handleNativeChange,
    handleNativeKeyDown,
    handleNativeBlur,
  } as const;
}
