import React, { useEffect, useRef } from 'react';

import { DO_NOT_TRIGGER_GESTURE_NAVIGATION_PROPS } from 'hooks/useTouchGestureNavigation';
import {
  _CarouselTrack,
  _CarouselViewport,
  _CarouselSlide,
  _CarouselRoot,
} from './styles';
import { CarouselProps } from './types';

export const Carousel = ({
  initialSlide = 0,
  children,
  testId,
  titleSection,
  footerSection,
  $adjustLeft = true,
  $backgroundColor,
}: CarouselProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      // Default to the width of an iPhone SE
      const childWidth = containerRef.current.children[0]?.clientWidth || 375;
      containerRef.current.scrollLeft = childWidth * initialSlide;
    }
  }, [initialSlide]);
  const innerCarousel = (
    <_CarouselViewport
      $adjustLeft={$adjustLeft}
      {...DO_NOT_TRIGGER_GESTURE_NAVIGATION_PROPS}
    >
      <_CarouselTrack ref={containerRef} data-testid={testId}>
        {React.Children.map(children, (child, index) => (
          <_CarouselSlide key={index}>{child}</_CarouselSlide>
        ))}
      </_CarouselTrack>
    </_CarouselViewport>
  );

  return titleSection || footerSection ? (
    <_CarouselRoot
      $adjustLeft={$adjustLeft}
      $backgroundColor={$backgroundColor}
    >
      {titleSection ? titleSection : null}
      {innerCarousel}
      {footerSection ? footerSection : null}
    </_CarouselRoot>
  ) : (
    innerCarousel
  );
};
