import { forwardRef } from 'react';

import { _BoxRoot } from './styles';
import type { Props } from './types';

export const Box = forwardRef<HTMLDivElement, Props>(
  (
    {
      borderColor = 'default',
      backgroundColor = 'base',
      color = 'primary',
      borderRadius = 'none',
      gradient,
      elevation,
      px = 'md',
      py = 'md',
      pxDesktop,
      pyDesktop,
      children,
      className,
      ...rest
    },
    ref,
  ) => (
    <_BoxRoot
      ref={ref}
      className={className}
      $borderColor={borderColor}
      $backgroundColor={backgroundColor}
      $color={color}
      $borderRadius={borderRadius}
      $gradient={gradient}
      $elevation={elevation}
      $px={px}
      $py={py}
      $pxDesktop={pxDesktop}
      $pyDesktop={pyDesktop}
      {...rest}
    >
      {children}
    </_BoxRoot>
  ),
);

Box.displayName = 'Box';
