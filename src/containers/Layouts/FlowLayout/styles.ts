import { styled, css } from 'styled-components';

import { Flex } from 'components/Flex';
import { from } from 'styles/media';
import {
  hideScrollbarForce,
  prettyScrollbar,
  scrollerContainer,
} from 'styles/mixins';

export const _FlowLayoutContentColumn = styled(Flex)<{
  $paddingInline?: string;
  $paddingBlock?: string;
}>`
  /* centered, width-constrained content */
  width: 100vw;
  max-width: 100%;

  /* Do not flex within the scroll viewport; keep intrinsic height */
  flex: 0 0 auto;

  /* Fill at least the viewport block size so justifyContent can distribute space on short pages */
  min-height: 100%;

  ${from.tabletPortrait} {
    width: 50vw;
  }

  ${({ $paddingInline, $paddingBlock }) => css`
    padding-inline: ${$paddingInline ?? '0'};
    padding-block: ${$paddingBlock ?? '0'};
  `}
`;

export const _FlowLayoutScrollViewport = styled.div<{
  $scrollLocked?: boolean;
}>`
  display: flex;
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
  justify-content: center;

  /* Prevent vertical stretching of the content column; let it keep intrinsic height */
  align-items: flex-start;

  ${scrollerContainer()};
  ${prettyScrollbar()};
  /* Flow pages scroll through this viewport. Keep this free of transforms. */
  ${hideScrollbarForce()};

  overflow-y: ${({ $scrollLocked }) => ($scrollLocked ? 'hidden' : 'auto')};
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
`;
