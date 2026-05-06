import { styled } from 'styled-components';

import type { Props } from './types';

export const _AutoFitTextContainer = styled.div`
  width: 100%;
  max-width: 100vw;
`;

export const _AutoFitTextMeasure = styled.div<{
  $mode: NonNullable<Props['mode']>;
  $hidden: boolean;
}>`
  display: ${({ $hidden }) => ($hidden ? 'none' : 'block')};
  position: ${({ $hidden }) => ($hidden ? 'static' : 'absolute')};
  visibility: ${({ $hidden }) => ($hidden ? 'visible' : 'hidden')};
  pointer-events: ${({ $hidden }) => ($hidden ? 'auto' : 'none')};
  white-space: ${({ $mode }) => ($mode === 'single' ? 'nowrap' : 'normal')};
`;

export const _AutoFitTextWrapper = styled.div<{
  $align: NonNullable<Props['align']>;
  $mode: NonNullable<Props['mode']>;
}>`
  display: inline-flex;
  justify-content: ${({ $align }) =>
    $align === 'center'
      ? 'center'
      : $align === 'right'
        ? 'flex-end'
        : 'flex-start'};
  width: 100%;
  white-space: ${({ $mode }) => ($mode === 'single' ? 'nowrap' : 'normal')};
`;
