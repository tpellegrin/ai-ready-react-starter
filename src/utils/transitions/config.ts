/**
 * Centralized configuration for transition animations
 * This file contains all animation parameters used throughout the application
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
    body: 'transition',
  },
};

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
