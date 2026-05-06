import React from 'react';

import { _FlexRoot } from './styles';
import type {
  Props,
  FlexAlignItems,
  FlexDirection,
  FlexJustifyContent,
} from './types';

const DEFAULT_ALIGN_ITEMS: Record<FlexDirection, FlexAlignItems> = {
  column: 'flex-start',
  row: 'center',
};

const DEFAULT_JUSTIFY_CONTENT: Record<FlexDirection, FlexJustifyContent> = {
  column: 'center',
  row: 'flex-start',
};

export const Flex = React.forwardRef<HTMLDivElement, Props>(
  (
    {
      alignItems,
      direction = 'column',
      gap = 'md',
      desktopGap,
      justifyContent,
      alignContent,
      width = '100%',
      height,
      flexWrap = 'nowrap',
      children,
      className,
      ...rest
    },
    ref,
  ) => (
    <_FlexRoot
      ref={ref}
      className={className}
      $alignItems={alignItems ?? DEFAULT_ALIGN_ITEMS[direction]}
      $direction={direction}
      $gap={gap}
      $desktopGap={desktopGap}
      $justifyContent={justifyContent ?? DEFAULT_JUSTIFY_CONTENT[direction]}
      $alignContent={alignContent}
      $width={width}
      $height={height}
      $flexWrap={flexWrap}
      {...rest}
    >
      {children}
    </_FlexRoot>
  ),
);

Flex.displayName = 'Flex';
