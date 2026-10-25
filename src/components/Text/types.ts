import { type ComponentPropsWithoutRef, type ReactNode } from 'react';

import { type typography } from 'styles/themes/typography';
import { type SpaceColorKeys } from 'styles/colors';

export type TextAlign = 'left' | 'right' | 'center' | 'justify';
export type TextColor = SpaceColorKeys<'text'>;
export type TextVariant = keyof typeof typography;

/** Elements Text can render as (text content only; use layout components otherwise). */
export type TextElement =
  | 'p'
  | 'span'
  | 'div'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'h5'
  | 'h6'
  | 'strong'
  | 'em'
  | 'small'
  | 'label'
  | 'legend';

export type Props = {
  /**
   * Element to render; on a `styled(Text)` wrapper, pass `forwardedAs` instead.
   * There `as` replaces Text itself (docs/ui/foundation.md).
   */
  as?: TextElement;
  /** Typography token. Omit to inherit the surrounding typography. */
  variant?: TextVariant;
  align?: TextAlign;
  /** Text color token. Omit to inherit the surrounding color. */
  color?: TextColor;
  truncate?: boolean;
  numeric?: 'default' | 'tabular';
  className?: string;
  fontSize?: number;
  children: ReactNode;
} & ComponentPropsWithoutRef<'span'>;
