import { css, styled } from 'styled-components';

import { getAccessibleDuration } from 'utils/transitions/config';
import { DURATION_MS } from 'containers/Layouts/common/LayoutTransitionContainer/types';

import type { Props } from './types';

export const _ProgressValue = styled.div.attrs({ 'data-allow-width': true })<{
  $value: number;
}>`
  height: 100%;
  background-color: ${({ theme }) => theme.colors.action.accent};
  will-change: width;
  backface-visibility: hidden;

  /* Keep component-specific timing via CSS variables consumed by the global clamp */
  --transition-duration: ${getAccessibleDuration(DURATION_MS)}ms;
  --transition-easing: ease-in-out;

  transition: width var(--transition-duration) var(--transition-easing);

  @media screen and (prefers-reduced-motion: reduce) {
    transition: none;
  }

  width: ${({ $value }) => $value}%;
`;

export const _ProgressRoot = styled.div<{
  $variant: Required<Props>['variant'];
}>`
  width: 100%;
  overflow: hidden;
  background-color: ${({ theme }) => theme.colors.accent.primary.s50};

  ${({ $variant, theme }) =>
    $variant === 'rounded' &&
    css`
      height: ${theme.spacers.xs};
      border-radius: ${theme.borderRadii.full};

      ${_ProgressValue} {
        min-width: ${theme.spacers.xs};
        border-radius: ${theme.borderRadii.full};
      }
    `}

  ${({ $variant, theme }) =>
    $variant === 'rectangular' &&
    css`
      height: ${theme.spacers.xxxs};

      ${_ProgressValue} {
        min-width: ${theme.spacers.xxxs};
      }
    `}
`;
