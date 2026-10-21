/**
 * Motion contracts shared by route shells, layouts and reveal helpers.
 *
 * This module is intentionally low-level (no React Router, no app context) so
 * shared UI primitives and app shells can both depend on it. See
 * docs/animation-system.md.
 */

export const TRANSITIONS = {
  duration: {
    default: 300,
    slow: 400,
    fast: 150,
  },
  easing: {
    default: 'ease-in-out',
    smooth: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
    linear: 'linear',
  },
  delay: {
    none: 0,
    short: 50,
    medium: 100,
  },
  class: {
    transition: 'transition-status',
  },
} as const;

/** Route transition variants. Non-flow routes fade; flow routes slide ltr/rtl. */
export const TransitionType = {
  ltr: 'ltr',
  rtl: 'rtl',
  fade: 'fade',
} as const;
export type TransitionType =
  (typeof TransitionType)[keyof typeof TransitionType];

/** Default route transition duration (ms) before reduced-motion clamping. */
export const DURATION_MS = TRANSITIONS.duration.default;
/** Base class name applied by react-transition-group to route wrappers. */
export const TRANSITION_CLASS = TRANSITIONS.class.transition;

/**
 * User preference for reduced motion
 * This checks if the user has requested reduced motion in their system settings
 */
export const prefersReducedMotion = (): boolean => {
  if (
    typeof window === 'undefined' ||
    typeof window.matchMedia !== 'function'
  ) {
    return false;
  }
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
};

/**
 * Get appropriate duration based on user preferences
 * Returns shorter durations if user prefers reduced motion
 */
export const getAccessibleDuration = (duration: number): number => {
  return prefersReducedMotion() ? Math.min(duration, 100) : duration;
};
