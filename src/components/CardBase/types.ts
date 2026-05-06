import React from 'react';

import { Props as BoxProps } from 'components/Box/types';

export type VariantProps = Pick<
  BoxProps,
  'borderColor' | 'backgroundColor' | 'color' | 'gradient'
>;

export const Variant = {
  base: 'base',
} as const;

export type CardVariant = keyof typeof Variant;

export type SizeProps = Pick<
  BoxProps,
  'borderRadius' | 'px' | 'py' | 'pxDesktop' | 'pyDesktop'
>;

export const Size = {
  xs: 'xs',
  sm: 'sm',
  md: 'md',
  lg: 'lg',
} as const;

export type CardSize = keyof typeof Size;

export type Props = {
  children?: React.ReactNode;
  className?: string;
  elevation?: BoxProps['elevation'];
  variant?: CardVariant;
  size?: CardSize;
};
