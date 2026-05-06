import { styled, css } from 'styled-components';

import { from } from 'styles/media';
import { getSpaceColor } from 'utils/colors';

import type { Props } from './types';

export const _BoxRoot = styled.div<{
  $borderColor?: Props['borderColor'];
  $backgroundColor?: Props['backgroundColor'];
  $color?: Props['color'];
  $borderRadius?: Props['borderRadius'];
  $gradient?: Props['gradient'];
  $elevation?: Props['elevation'];
  $px?: Props['px'];
  $py?: Props['py'];
  $pxDesktop?: Props['pxDesktop'];
  $pyDesktop?: Props['pyDesktop'];
}>`
  padding-inline: ${({ theme, $px }) => theme.spacers[$px ?? 'md']};
  padding-block: ${({ theme, $py }) => theme.spacers[$py ?? 'md']};
  ${({ theme, $pxDesktop }) =>
    $pxDesktop &&
    css`
      ${from.desktop} {
        padding-inline: ${theme.spacers[$pxDesktop]};
      }
    `}
  ${({ theme, $pyDesktop }) =>
    $pyDesktop &&
    css`
      ${from.desktop} {
        padding-block: ${theme.spacers[$pyDesktop]};
      }
    `}
  border: 1px solid
  ${({ theme, $borderColor }) =>
    getSpaceColor(theme, $borderColor ?? 'border.default', 'border')};
  border-radius: ${({ theme, $borderRadius }) =>
    theme.borderRadii[$borderRadius ?? 'none']};
  color: ${({ theme, $color }) =>
    getSpaceColor(theme, $color ?? 'primary', 'text')};

  ${({ $gradient, theme, $backgroundColor }) =>
    $gradient
      ? css`
          background: ${theme.gradients[$gradient]};
        `
      : css`
          background-color: ${getSpaceColor(
            theme,
            $backgroundColor ?? 'base',
            'surface',
          )};
        `}

  ${({ $elevation, theme }) =>
    $elevation &&
    css`
      box-shadow: ${theme.shadows.elevation[$elevation]};
    `}
`;
