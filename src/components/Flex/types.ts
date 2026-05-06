import type React from 'react';

import type { Theme } from 'styles/themes/types';

export const flexDirections = ['column', 'row'] as const;
export type FlexDirection = (typeof flexDirections)[number];

export const flexAlignItems = [
  'stretch',
  'baseline',
  'center',
  'flex-start',
  'flex-end',
] as const;
export type FlexAlignItems = (typeof flexAlignItems)[number];

export const flexJustifyContent = [
  'center',
  'flex-start',
  'flex-end',
  'space-between',
  'space-around',
  'space-evenly',
] as const;
export type FlexJustifyContent = (typeof flexJustifyContent)[number];

export const flexAlignContent = [
  'stretch',
  'center',
  'flex-start',
  'flex-end',
  'space-between',
  'space-around',
  'space-evenly',
] as const;
export type FlexAlignContent = (typeof flexAlignContent)[number];

export type FlexWrap = 'nowrap' | 'wrap' | 'wrap-reverse';

export type Props = React.HTMLAttributes<HTMLDivElement> & {
  direction?: FlexDirection;
  gap?: keyof Theme['spacers'];
  desktopGap?: keyof Theme['spacers'];
  alignItems?: FlexAlignItems;
  justifyContent?: FlexJustifyContent;
  alignContent?: FlexAlignContent;
  width?: React.CSSProperties['width'];
  height?: React.CSSProperties['height'];
  flexWrap?: FlexWrap;
};
