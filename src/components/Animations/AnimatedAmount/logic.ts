import * as React from 'react';

import {
  TRANSITIONS,
  getAccessibleDuration,
  prefersReducedMotion,
} from '@utils/transitions/config';
import { OverlayRoleContext } from '@components/CenterOnlyTransition/OverlayRoleContext';

const EASINGS = {
  easeIn: (t: number) => t * t * t,
  easeOut: (t: number) => 1 - Math.pow(1 - t, 3),
  easeInOut: (t: number) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
} as const;

export type EasingName = keyof typeof EASINGS;

type UseAnimatedNumberCfg = {
  value: number;
  initialValue?: number;
  durationMs?: number;
  easing?: EasingName | ((t: number) => number);
  animateOnChange?: boolean;
  allowMotionOverride?: boolean;
  onDone?: (finalValue: number) => void;
};

export function useAnimatedNumber({
  value,
  initialValue = 0,
  durationMs = TRANSITIONS.duration.default,
  easing = 'easeIn',
  animateOnChange = true,
  allowMotionOverride,
  onDone,
}: UseAnimatedNumberCfg) {
  const overlayRole = React.useContext(OverlayRoleContext);
  const reduced = prefersReducedMotion();
  const effectiveDuration = getAccessibleDuration(durationMs);
  const easingFn =
    typeof easing === 'function'
      ? easing
      : (EASINGS[easing] ?? EASINGS.easeOut);

  const shouldAnimate =
    (allowMotionOverride ?? (!reduced && overlayRole !== 'exit')) &&
    effectiveDuration > 0 &&
    animateOnChange;

  // Public state exposed to callers.
  const [displayValue, setDisplayValue] = React.useState<number>(() =>
    shouldAnimate ? initialValue : value,
  );

  // Keep a ref of the latest display value to avoid any effect churn.
  const displayValueRef = React.useRef(displayValue);
  React.useEffect(() => {
    displayValueRef.current = displayValue;
  }, [displayValue]);

  // Animation bookkeeping.
  const startValueRef = React.useRef<number>(displayValueRef.current);
  const targetValueRef = React.useRef<number>(value);
  const startTimeRef = React.useRef<number | null>(null);
  const frameIdRef = React.useRef<number | null>(null);
  const isAnimatingRef = React.useRef<boolean>(false);

  // Stable onDone via ref.
  const onDoneRef = React.useRef<typeof onDone>(onDone);
  React.useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  const lastCompletedValueRef = React.useRef<number | null>(null);
  const reportDone = React.useCallback((finalValue: number) => {
    if (lastCompletedValueRef.current === finalValue) return;
    lastCompletedValueRef.current = finalValue;
    onDoneRef.current?.(finalValue);
  }, []);

  /**
   * Stop any in-flight animation.
   * - snapToTarget: if true, immediately set display to targetValueRef.
   * onDone is *not* called here – only on natural completion.
   */
  const stopAnimation = React.useCallback((snapToTarget: boolean) => {
    if (frameIdRef.current != null) {
      cancelAnimationFrame(frameIdRef.current);
      frameIdRef.current = null;
    }

    isAnimatingRef.current = false;
    startTimeRef.current = null;

    if (snapToTarget) {
      const target = targetValueRef.current;
      setDisplayValue(target);
      displayValueRef.current = target;
    }
  }, []);

  /**
   * Start a new tween from the current displayed value to the given target.
   * If motion is disabled or duration is zero, we snap instead of animating.
   */
  const startAnimation = React.useCallback(
    (target: number) => {
      if (!Number.isFinite(target)) {
        // Non-finite target: just snap, no callback.
        targetValueRef.current = target;
        stopAnimation(true);
        return;
      }

      if (!shouldAnimate || effectiveDuration <= 0) {
        targetValueRef.current = target;
        stopAnimation(true);
        return;
      }

      const now =
        typeof performance !== 'undefined'
          ? () => performance.now()
          : () => Date.now();

      startValueRef.current = displayValueRef.current;
      targetValueRef.current = target;
      startTimeRef.current = now();
      isAnimatingRef.current = true;

      const tick = () => {
        if (!isAnimatingRef.current || startTimeRef.current == null) return;

        const elapsed = now() - startTimeRef.current;
        const tRaw = elapsed / effectiveDuration;
        const t = Math.min(1, Math.max(0, tRaw));

        const eased = easingFn(t);

        const from = startValueRef.current;
        const to = targetValueRef.current;
        const next = from + (to - from) * eased;

        setDisplayValue(next);
        displayValueRef.current = next;

        if (t < 1) {
          frameIdRef.current = requestAnimationFrame(tick);
        } else {
          // Natural completion of the tween.
          isAnimatingRef.current = false;
          startTimeRef.current = null;
          frameIdRef.current = null;

          // Snap exactly to the final target.
          const finalTarget = targetValueRef.current;
          setDisplayValue(finalTarget);
          displayValueRef.current = finalTarget;

          // Call onDone *after* at least one visual frame with the final value.
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              reportDone(finalTarget);
            });
          });
        }
      };

      // Cancel any previous loop before starting a new one.
      if (frameIdRef.current != null) {
        cancelAnimationFrame(frameIdRef.current);
      }
      frameIdRef.current = requestAnimationFrame(tick);
    },
    [shouldAnimate, effectiveDuration, easingFn, stopAnimation, reportDone],
  );

  /**
   * Respond to changes in the target value or animation configuration.
   * - If animation is disabled, snap immediately to the latest value.
   * - If animation is allowed, start (or restart) a tween towards `value`.
   */
  React.useEffect(() => {
    if (!shouldAnimate) {
      targetValueRef.current = value;
      stopAnimation(true); // snap, no onDone (no real animation)
      return;
    }

    // If we're already at the target and not animating, nothing to do.
    if (!isAnimatingRef.current && displayValueRef.current === value) {
      return;
    }

    startAnimation(value);
  }, [value, shouldAnimate, startAnimation, stopAnimation]);

  /**
   * Cleanup: cancel any in-flight RAF when the hook unmounts.
   */
  React.useEffect(() => {
    return () => {
      if (frameIdRef.current != null) {
        cancelAnimationFrame(frameIdRef.current);
      }
    };
  }, []);

  return displayValue;
}
