import { styled, css } from 'styled-components';

import { getSpaceColor } from 'styles/colors';
import { typography } from 'styles/themes/typography';
import { type Props } from './types';

export const _TextRoot = styled.p<{
  $variant?: Props['variant'] | undefined;
  $align?: Props['align'] | undefined;
  $color?: Props['color'] | undefined;
  $truncate?: boolean | undefined;
  $numeric?: Props['numeric'] | undefined;
  $fontSize?: number | undefined;
}>`
  color: inherit;

  ${({ $variant }) => $variant && typography[$variant]}

  ${({ $fontSize }) =>
    $fontSize &&
    css`
      font-size: ${$fontSize}px;
    `}

  a {
    text-decoration: underline;
  }

  ${({ $color, theme }) =>
    !!$color &&
    css`
      color: ${getSpaceColor(theme, $color, 'text')};
    `}

  ${({ $truncate }) =>
    $truncate &&
    css`
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 100%;
    `}

  ${({ $numeric }) =>
    $numeric === 'tabular' &&
    css`
      font-variant-numeric: tabular-nums;
    `}

  ${({ $align }) =>
    $align &&
    css`
      text-align: ${$align};
    `}
`;
