import * as React from 'react';

import { Props } from './types';
import { useAutoFitText } from './logic';
import {
  _AutoFitTextContainer,
  _AutoFitTextMeasure,
  _AutoFitTextWrapper,
} from './styles';

// Note: AutoFitText may compute font size too small in some cases.
// There may be a sizing issue when AutoFitText is used without `measureText`
// inside containers that are undergoing entrance or layout animations.
//
// Hypothesis:
// - In the no-`measureText` path, the component measures its visible wrapper.
// - During animated transitions (e.g., transforms applied by FlowLayout,
//   CenterToTopEntrance, or other motion wrappers), getBoundingClientRect()
//   may temporarily report a width/height that is significantly smaller than
//   the element's final settled size.
// - If measurement occurs during this transient phase, the binary-search
//   fitter may decide the text only “fits” at the minimum font size
//   (e.g., 1px or the provided minFontSize), causing the content to appear
//   invisible or remain permanently undersized.
// - Once the animation completes, no resize event is dispatched for this
//   layout change, so AutoFitText does not automatically re-measure,
//   and the incorrect size persists.
//
// Investigation paths:
// - Delay auto-fitting until after layout/entrance animations have settled
//   (e.g., gate `autoFit` behind an animation-complete `ready` flag).
// - Prefer a stable external measurement container via `measureContainerRef`
//   when wrapping AutoFitText in animated UI regions.
// - Add defensive guards to defer fitting when measured dimensions are
//   implausibly small (e.g., <10px), and retry on the next layout frame.
//
// Summary:
// The issue may stem from measuring during transient animated layouts, leading
// to an incorrect minimum font size being locked in. Further investigation is
// needed to confirm and address this behavior.
export const AutoFitText: React.FC<Props> = ({
  children,
  measureText,
  autoFit = true,
  minFontSize = 1,
  maxFontSize = 500,
  mode = 'single',
  autoResize = true,
  onReady,
  style,
  className,
  align = 'left',
  measureContainerRef,
}) => {
  const {
    containerRef,
    measureRef,
    wrapperRef,
    computedFontSize,
    clonedChild,
    clonedMeasure,
  } = useAutoFitText({
    children,
    measureText,
    autoFit,
    minFontSize,
    maxFontSize,
    mode,
    autoResize,
    onReady,
    measureContainerRef,
  });

  return (
    <_AutoFitTextContainer
      ref={containerRef}
      style={style}
      className={className}
    >
      {/* Hidden measuring node; only used when measureText is provided */}
      <_AutoFitTextMeasure
        ref={measureRef}
        $mode={mode}
        $hidden={!measureText}
        style={
          measureText
            ? {
                fontSize: computedFontSize,
              }
            : undefined
        }
      >
        {clonedMeasure}
      </_AutoFitTextMeasure>

      {/* Visible content */}
      <_AutoFitTextWrapper
        ref={wrapperRef}
        $align={align}
        $mode={mode}
        style={{
          fontSize: computedFontSize,
        }}
      >
        {clonedChild}
      </_AutoFitTextWrapper>
    </_AutoFitTextContainer>
  );
};
