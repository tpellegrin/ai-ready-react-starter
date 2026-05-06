import { styled, css } from 'styled-components';

import { getAccessibleDuration } from 'utils/transitions/config';

export const _FromBelowRevealRoot = styled.div<{
  $duration: number;
  $delay: number;
  $offset: number;
  $easing: string;
  $reduced: boolean;
  $active: boolean;
  $freeze?: boolean;
}>`
  width: 100%;
  will-change: transform, opacity;
  backface-visibility: hidden;

  ${({ $reduced, $active, $offset }) =>
    $reduced
      ? css`
          opacity: ${$active ? 1 : 0};
          transform: none;
        `
      : css`
          opacity: ${$active ? 1 : 0};
          transform: translate3d(0, ${$active ? 0 : $offset}px, 0);
        `}

  ${({ $reduced, $duration, $delay, $easing }) =>
    $reduced
      ? ''
      : css`
          /* Expose component timing via CSS variables so global clamp respects it */
          --transition-duration: ${getAccessibleDuration($duration)}ms;
          --transition-easing: ${$easing};

          transition:
            transform var(--transition-duration) var(--transition-easing)
              var(--reveal-delay, ${$delay}ms),
            opacity var(--transition-duration) var(--transition-easing)
              var(--reveal-delay, ${$delay}ms);
        `}

  /* Authoritative freeze while in the exit overlay:
   - keep final visible state
   - disable any transitions (prevents late plays/flicker)
   - drop will-change to relax GPU pressure */
  ${({ $freeze }) =>
    $freeze &&
    css`
      opacity: 1 !important;
      transform: none !important;
      transition: none !important;
      will-change: auto;
    `}
`;
