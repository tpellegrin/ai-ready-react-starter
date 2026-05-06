import { ElementType, ReactNode, ComponentPropsWithoutRef } from 'react';

import { typography } from 'styles/themes/typography';
import { SpaceColorKeys } from 'utils/colors';

export type TextAlign = 'left' | 'right' | 'center' | 'justify';
export type TextColor = SpaceColorKeys<'text'>;
export type TextVariant = keyof typeof typography;

export type Props = {
  as?: ElementType;
  variant?: TextVariant;
  align?: TextAlign;
  color?: TextColor;
  truncate?: boolean;
  numeric?: 'default' | 'tabular';
  className?: string;
  fontSize?: number;
  children: ReactNode;
} & ComponentPropsWithoutRef<'span'>;
