import * as React from 'react';

export type Props = {
  /** The element we actually want to show (AnimatedAmount, Text, etc.) */
  children: React.ReactElement<{ style?: React.CSSProperties }>;
  /** Optional *final* text we should size against. If present, it takes precedence. */
  measureText?: React.ReactNode;
  autoFit?: boolean;
  minFontSize?: number;
  maxFontSize?: number;
  /** Single line (fit width) or multi line (fit height+width) */
  mode?: 'single' | 'multi';
  autoResize?: boolean;
  onReady?: (fontSize: number) => void;
  style?: React.CSSProperties;
  className?: string;
  align?: 'left' | 'center' | 'right';
  /** Optional external box to measure instead of the internal container */
  measureContainerRef?: React.RefObject<HTMLDivElement | null>;
};

/**
 * Internal logic props for the hook.
 * These are the props that actually affect measurement / fitting.
 */
export type AutoFitTextLogicProps = {
  children: Props['children'];
  measureText: Props['measureText'];
  autoFit: boolean;
  minFontSize: number;
  maxFontSize: number;
  mode: NonNullable<Props['mode']>;
  autoResize: boolean;
  onReady?: Props['onReady'];
  measureContainerRef?: Props['measureContainerRef'];
};
