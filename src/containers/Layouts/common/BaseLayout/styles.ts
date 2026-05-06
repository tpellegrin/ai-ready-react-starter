/**
 * BaseLayout styles
 *
 * Structure:
 * - _BaseLayoutRoot: page root container (fills viewport height).
 * - _BaseLayoutMain: scrollable area that holds optional header, content, and (non-fixed) footer.
 *   - Applies background color/gradient.
 *   - Adds bottom padding equal to measured fixed footer height + safe-area inset (when applicable).
 * - _BaseLayoutHeader: optional header region (can be sticky within the scroll container).
 * - _BaseLayoutFooter: footer region; when `$fixed` is true it is fixed to the viewport.
 * - _BaseLayoutContent: centered content container with optional max width and paddings.
 *
 * Accessibility & UX:
 * - Sticky header remains within the main landmark (`<main>`), preserving semantics.
 * - Fixed footer respects `env(safe-area-inset-bottom)` for modern phones.
 * - `overscroll-behavior: contain` avoids scroll chaining (nice for nested scroll).
 */

import { styled, css } from 'styled-components';

import { Theme } from 'styles/themes/types';
import { getSpaceColor, SpaceColorKeys } from 'utils/colors';
import {
  prettyScrollbar,
  fillParent,
  hideScrollbarVisual,
} from 'styles/mixins';

export const MAX_WIDTH = 640;

export const _BaseLayoutRoot = styled.div`
  display: flex;
  flex-direction: column;
  height: 100dvh;
`;

export const _BaseLayoutMain = styled.main<{
  $backgroundColor?: SpaceColorKeys<'surface'>;
  $gradient?: keyof Theme['gradients'];
}>`
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto; /* header | content | footer */
  flex: 1 1 100%;
  width: 100%;
  overflow: hidden;
  scrollbar-gutter: stable;
  min-height: 0;
  overscroll-behavior: contain;
  background-color: ${({ theme, $backgroundColor = 'base' }) =>
    getSpaceColor(theme, $backgroundColor, 'surface')};

  ${({ $gradient, theme }) =>
    !!$gradient &&
    css`
      background: ${theme.gradients[$gradient]};
    `}
`;

export const _BaseLayoutHeader = styled.header<{ $sticky?: boolean }>`
  /* Header sits in the first grid row; the scroller is the center row,
     so the header is naturally pinned without sticky positioning. */
  grid-row: 1;
  position: static;
  z-index: 10;

  /* Promote to a stable layer to prevent flicker during center overlay promotion */
  will-change: transform;
  backface-visibility: hidden;
  transform: translateZ(0);
`;

export const _BaseLayoutFooter = styled.footer<{ $fixed?: boolean }>`
  /* Footer is the third grid row; always visible, no overlay */
  grid-row: 3;
  position: static;
  z-index: 10;
  width: 100%;
  padding-bottom: env(safe-area-inset-bottom, 0);

  > .layout-footer-inner {
    width: 100%;
    max-width: ${MAX_WIDTH}px;
    margin-inline: auto;
  }
`;

export const _BaseLayoutContent = styled.div<{
  $maxWidth?: number;
  $footerOffset?: number;
}>`
  ${prettyScrollbar()}

  /* Center scroller sits in the 2nd grid row */
  grid-row: 2;
  ${fillParent};

  /* Footer lives in its own grid row; no overlap padding needed */
  padding-bottom: 0;
  scroll-padding-bottom: 0;
  margin-inline: auto;
  box-sizing: border-box;
  width: 100%;
  min-height: 0;
  overflow: hidden auto;
  overscroll-behavior-y: contain;

  /* While a route transition is in progress, lock scroll and stabilize scrollbar visuals */
  &[data-transitioning] {
    overflow-y: hidden;
    ${hideScrollbarVisual({ size: '7px' })}
  }
`;
