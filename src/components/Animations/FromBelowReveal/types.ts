import type React from 'react';

import { TRANSITIONS } from 'utils/transitions/config';

export type RevealVars = { ['--reveal-delay']?: string };

export const DEFAULTS = {
  delayMs: TRANSITIONS.delay.none,
  durationMs: TRANSITIONS.duration.default,
  yOffset: 16,
  easing: TRANSITIONS.easing.default,
} as const;

export interface Props {
  /** Controls visibility; when true, content animates into view */
  in?: boolean;
  /** Delay in ms before animation starts */
  delayMs?: number;
  /** Duration in ms (will be clamped via getAccessibleDuration) */
  durationMs?: number;
  /** Initial Y offset in px for the slide-up */
  yOffset?: number;
  /** CSS easing name or cubic-bezier */
  easing?: string;
  /** Optional className passthrough */
  className?: string;
  /** Optional inline style */
  style?: React.CSSProperties;
  /** Optional element/component to render as */
  as?: React.ElementType;
  /** Children to reveal */
  children?: React.ReactNode;
  /** When it becomes visible (ARMED → ACTIVE) */
  onReveal?: () => void;
  /** After delay+duration completes */
  onDone?: () => void;
}
