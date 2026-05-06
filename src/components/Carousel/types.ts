import React from 'react';
import { SpaceColorKeys } from 'utils/colors';

export type CarouselProps = {
  $adjustLeft?: boolean;
  initialSlide?: number;
  $backgroundColor?: SpaceColorKeys<'surface'>;
  children: React.ReactNode;
  titleSection?: React.ReactNode;
  footerSection?: React.ReactNode;
  testId?: string;
};
