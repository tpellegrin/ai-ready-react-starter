import type * as React from 'react';

export type Props<E extends React.ElementType = 'div'> = {
  /** Polymorphic element type to render as the container. Defaults to 'div'. */
  as?: E;
  /** CSS selector to choose which descendants should animate. Defaults to ':scope > *'. */
  selector?: string;
  /** Duration in ms (will be clamped via getAccessibleDuration). */
  durationMs?: number;
  /** CSS timing function for the transform transition. */
  easing?: string;
  /** Disable the animation entirely. */
  disabled?: boolean;
  /** Lock animation to a single axis to avoid diagonal paths. */
  lockAxis?: 'x' | 'y';
  /**
   * Optional dependency list to trigger FLIP re-measurement when values change.
   * If not provided, the hook uses children and key knobs as the default dependency.
   */
  deps?: React.DependencyList;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
} & Omit<
  React.ComponentPropsWithoutRef<E>,
  'as' | 'children' | 'className' | 'style'
>;
