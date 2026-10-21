import { styled } from 'styled-components';

import { fillParent } from 'styles/mixins';

export const _CenterOnlyTransitionRoot = styled.div`
  ${fillParent};

  position: relative;
  width: 100%;
  height: auto;
  min-height: 0.0625rem;
  overflow: visible;
  contain: none;
  isolation: isolate;

  &[data-center-phase='overlay'] {
    overflow: hidden;
    contain: layout paint;
  }
`;

export const _CenterOnlyTransitionScene = styled.div<{ $overlay?: boolean }>`
  ${fillParent};

  position: ${({ $overlay }) => ($overlay ? 'absolute' : 'static')};
  inset: 0;
  width: 100%;
  height: ${({ $overlay }) => ($overlay ? '100%' : 'auto')};

  /* Default interactive; specifically disable for the exit overlay */
  pointer-events: auto;

  &[data-overlay='exit'] {
    pointer-events: none;
  }

  /* Keep scene wrappers transform-free. Motion belongs to [data-center-content]. */
  &[data-allow-motion] [data-center-content] {
    will-change: transform;
  }
`;
