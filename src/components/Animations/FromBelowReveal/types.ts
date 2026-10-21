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
  in?: boolean | undefined;
  /** Delay in ms before animation starts */
  delayMs?: number | undefined;
  /** Duration in ms (will be clamped via getAccessibleDuration) */
  durationMs?: number | undefined;
  /** Initial Y offset in px for the slide-up */
  yOffset?: number | undefined;
  /** CSS easing name or cubic-bezier */
  easing?: string | undefined;
  /** Optional className passthrough */
  className?: string | undefined;
  /** Optional inline style */
  style?: React.CSSProperties | undefined;
  /** Optional element/component to render as */
  as?: React.ElementType | undefined;
  /** Children to reveal */
  children?: React.ReactNode | undefined;
  /** When it becomes visible (ARMED → ACTIVE) */
  onReveal?: () => void | undefined;
  /** After delay+duration completes */
  onDone?: () => void | undefined;
}
