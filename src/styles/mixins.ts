import { css } from 'styled-components';

export const hideScrollbar = () => css`
  @media (pointer: none), (pointer: coarse) {
    -ms-overflow-style: none; /* IE and Edge */
    scrollbar-width: none; /* Firefox */
    ::-webkit-scrollbar {
      display: none;
    }
  }
`;

/**
 * Forcefully hide scrollbars cross-browser regardless of pointer type.
 * Use sparingly and only for short-lived transitions.
 */
export const hideScrollbarForce = () => css`
  -ms-overflow-style: none; /* IE and Edge */
  scrollbar-width: none; /* Firefox */
  &::-webkit-scrollbar {
    display: none;
  }
`;

/**
 * Visually hide scrollbars while preserving layout/gutter.
 * This keeps the scrollbar "present" so width doesn't jump during transitions.
 * - Firefox: make track/thumb transparent via scrollbar-color (keeps gutter)
 * - WebKit: keep scrollbar displayed with the same width but transparent colors
 */
export const hideScrollbarVisual = ({
  size = '7px',
}: {
  size?: string;
} = {}) => css`
  /* Firefox: keep gutter but hide visuals */
  scrollbar-width: thin;
  scrollbar-color: transparent transparent;

  /* WebKit: keep the scrollbar rendered with same width but transparent */
  &::-webkit-scrollbar {
    width: ${size};
    height: ${size};
  }

  &::-webkit-scrollbar-track {
    background-color: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background-color: transparent;
    background-clip: padding-box;
    border: 2px solid transparent;
  }

  &::-webkit-scrollbar-corner {
    background: transparent;
  }
`;

/**
 * prettyScrollbar
 * Cross-browser scrollbar styling (Firefox + WebKit) with theme-based defaults.
 * Options: size, radius, trackColor, thumbColor, thumbHoverColor, cornerColor.
 * Usage:
 *   - Apply on the element that actually scrolls (e.g., the main layout <main>).
 *   - Works alongside hideScrollbar() which hides scrollbars on coarse pointers.
 */
export const prettyScrollbar = ({
  size = '7px',
  radius = '8px',
  trackColor,
  thumbColor,
  thumbHoverColor,
  cornerColor,
}: {
  size?: string;
  radius?: string;
  trackColor?: string;
  thumbColor?: string;
  thumbHoverColor?: string;
  cornerColor?: string;
} = {}) => css`
  /* Firefox */
  scrollbar-width: thin;
  ${({ theme }) => {
    const track =
      trackColor ?? (theme?.colors?.surface?.transparent || 'transparent');
    const thumb =
      thumbColor ??
      (theme?.colors?.transparent?.dark?.s150 || 'rgba(0,0,0,0.4)');
    const thumbHover =
      thumbHoverColor ??
      (theme?.colors?.action?.primaryHover || 'rgba(0,0,0,0.6)');
    const corner = cornerColor ?? track;
    return css`
      scrollbar-color: ${thumb} ${track};

      /* WebKit */
      &::-webkit-scrollbar {
        width: ${size};
        height: ${size};
      }

      &::-webkit-scrollbar-track {
        background-color: ${track};
      }

      &::-webkit-scrollbar-thumb {
        background-color: ${thumb};
        background-clip: padding-box;
        border: 2px solid ${track};
        border-radius: ${radius};
      }

      &::-webkit-scrollbar-thumb:hover {
        background-color: ${thumbHover};
      }

      &::-webkit-scrollbar-corner {
        background: ${corner};
      }
    `;
  }}
`;

/**
 * Scroller pattern to keep scrollbar flush with container edge while content keeps padding.
 * Usage:
 *  - Apply scrollerContainer() on the scrolling element.
 *  - Wrap content with an inner element and apply scrollerInner({ paddingInline, paddingBlock }).
 */
export const scrollerContainer = () => css`
  overflow: hidden auto;
  padding: 0; /* no padding on the scroller */
  scrollbar-gutter: stable; /* reserve gutter space to prevent layout shift */
`;

export const scrollerInner = ({
  paddingInline,
  paddingBlock,
}: {
  paddingInline?: string;
  paddingBlock?: string;
} = {}) => css`
  box-sizing: border-box;
  ${paddingInline ? `padding-inline: ${paddingInline};` : ''}
  ${paddingBlock ? `padding-block: ${paddingBlock};` : ''}
  min-width: 100%; /* avoid unintended horizontal scroll */
`;

export const fillParent = css`
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
`;

export const visuallyHidden = css`
  pointer-events: none;
  opacity: 0;
  outline: 0;
  margin: 0;
  height: 0;
  width: 0;
  overflow: hidden;
  position: absolute;
  z-index: -9999;
`;
