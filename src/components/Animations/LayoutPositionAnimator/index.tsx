import React from 'react';

import { getAccessibleDuration } from 'utils/transitions/config';
import { useFlipLayout } from 'hooks/useFlipLayout';
import { UseFlipLayoutOptions } from 'hooks/useFlipLayout/types';

import { _LayoutPositionAnimatorRoot } from './styles';
import type { Props } from './types';

export const LayoutPositionAnimator = <E extends React.ElementType = 'div'>(
  props: Props<E>,
) => {
  const {
    as,
    selector,
    durationMs = 250,
    easing = 'ease-in-out',
    disabled,
    lockAxis,
    deps,
    className,
    style,
    children,
    ...rest
  } = props;

  const ref = React.useRef<HTMLElement | null>(null);

  // When no explicit deps are provided, run when children/other knobs change
  const derivedDeps: React.DependencyList = deps ?? [
    children,
    selector,
    durationMs,
    easing,
    disabled,
    lockAxis,
  ];

  useFlipLayout(ref, derivedDeps, {
    selector,
    durationMs,
    easing,
    disabled,
    lockAxis,
  } as UseFlipLayoutOptions);

  const accessible = getAccessibleDuration(durationMs);

  const mergedStyle = {
    ...(style ?? {}),
    ['--transition-duration' as string]: `${accessible}ms`,
    ['--transition-easing' as string]: easing,
  } as React.CSSProperties;

  return (
    <_LayoutPositionAnimatorRoot
      as={as || 'div'}
      ref={ref as React.RefObject<HTMLDivElement>}
      className={className}
      style={mergedStyle}
      data-allow-motion
      {...rest}
    >
      {children}
    </_LayoutPositionAnimatorRoot>
  );
};
