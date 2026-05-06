import { styled, css } from 'styled-components';

import { from } from 'styles/media';

import type { Props } from './types';

export const _FlexRoot = styled.div<{
  $alignItems: Required<Props>['alignItems'];
  $direction: Required<Props>['direction'];
  $gap: Required<Props>['gap'];
  $desktopGap?: Props['desktopGap'];
  $flexWrap: Required<NonNullable<Props['flexWrap']>>;
  $justifyContent: Required<Props>['justifyContent'];
  $alignContent?: Props['alignContent'];
  $width: Required<Props>['width'];
  $height?: Props['height'];
}>`
  display: flex;
  flex-direction: ${({ $direction }) => $direction};
  align-items: ${({ $alignItems }) => $alignItems};
  justify-content: ${({ $justifyContent }) => $justifyContent};
  gap: ${({ $gap, theme }) => theme.spacers[$gap]};
  width: ${({ $width }) => $width};

  box-sizing: border-box;

  /* Ensure flex children can shrink below their content size in constrained layouts */
  min-width: 0;
  min-height: 0;

  ${({ $height }) =>
    $height &&
    css`
      height: ${$height};
    `}

  flex-wrap: ${({ $flexWrap }) => $flexWrap};

  ${({ $alignContent, $flexWrap }) =>
    $alignContent &&
    $flexWrap !== 'nowrap' &&
    css`
      align-content: ${$alignContent};
    `}

  ${({ $desktopGap, theme }) =>
    $desktopGap &&
    css`
      ${from.tabletPortrait} {
        gap: ${theme.spacers[$desktopGap]};
      }
    `}
`;
