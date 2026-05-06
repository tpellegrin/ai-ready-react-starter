export type UseFlipLayoutOptions = {
  /** CSS selector for animating descendants. Defaults to ':scope > *'. */
  selector?: string;
  /** Duration in ms (clamped for accessibility). */
  durationMs?: number;
  /** CSS timing function string. */
  easing?: string;
  /** Disable the animation entirely. */
  disabled?: boolean;
  /** Lock animation to a single axis. */
  lockAxis?: 'x' | 'y';
  /** If true, compose with existing transforms instead of overwriting (opt-in, default false). */
  composeTransforms?: boolean;
};

export type FlipEntry = {
  host: HTMLElement;
  target: HTMLElement;
  prevRect: DOMRect;
  currRect: DOMRect;
  dx: number;
  dy: number;
  prevInlineTransform: string;
  prevInlineTransition: string;
  addedOptIn: boolean;
  computedTransform: string;
};
