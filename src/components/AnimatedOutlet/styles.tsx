import { styled } from 'styled-components';

import { TRANSITIONS } from 'utils/transitions/config';
import { TransitionType } from 'containers/Layouts/common/LayoutTransitionContainer/types';

/**
 * Stage provides a clipping container and stacking context for route pages.
 * It ensures content remains visible when idle and during transitions.
 */
export const Stage = styled.div`
  /* Provide a default that lints and browsers can resolve; inherited by children */
  --route-transition-duration: ${TRANSITIONS.duration.default}ms;

  position: relative;
  width: 100%;
  min-height: 100vh; /* ensure space so content doesn't collapse */
  overflow: hidden; /* clip sliding pages */
  contain: layout paint;
  isolation: isolate;
`;

/**
 * Wrapper is the per-page container. It stays in normal flow when idle,
 * and becomes absolutely positioned only during enter/exit phases, so both
 * the leaving and entering pages can animate concurrently.
 */
export const Wrapper = styled.div`
  position: relative; /* normal flow by default */
  width: 100%;
  height: auto;

  /* Isolate this page's paint/layout so ancestor toggles don't retrigger child transitions */
  contain: layout paint;
  isolation: isolate;
  will-change: transform, opacity;
  backface-visibility: hidden;
  transform: translateZ(0);

  /* Base transition styles */
  &.transition-status {
    transition-timing-function: ${TRANSITIONS.easing.default};
    transition-duration: var(
      --route-transition-duration,
      ${TRANSITIONS.duration.default}ms
    );
    transition-property: transform, opacity;
  }

  /* During transitions, stack pages on top of each other */
  &.transition-status-enter,
  &.transition-status-enter-active,
  &.transition-status-exit,
  &.transition-status-exit-active {
    position: absolute;
    inset: 0;
    height: 100%;
    transform: translateZ(0);
  }

  /* Left to Right transition (new screen comes from right) */
  .routes-stage[data-route-transition='${TransitionType.ltr}']
    &.transition-status:not(.transition-status--reduced-motion) {
    &.transition-status-enter {
      transform: translateX(100%);
    }

    &.transition-status-enter-active {
      transform: translateX(0);
    }

    &.transition-status-exit {
      transform: translateX(0);
    }

    &.transition-status-exit-active {
      transform: translateX(-100%);
    }
  }

  /* Right to Left transition (new screen comes from left) */
  .routes-stage[data-route-transition='${TransitionType.rtl}']
    &.transition-status:not(.transition-status--reduced-motion) {
    &.transition-status-enter {
      transform: translateX(-100%);
    }

    &.transition-status-enter-active {
      transform: translateX(0);
    }

    &.transition-status-exit {
      transform: translateX(0);
    }

    &.transition-status-exit-active {
      transform: translateX(100%);
    }
  }

  /* Fade transition */
  .routes-stage[data-route-transition='${TransitionType.fade}']
    &.transition-status {
    &.transition-status-enter {
      opacity: 0;
    }

    &.transition-status-enter-active {
      opacity: 1;
    }

    &.transition-status-exit {
      opacity: 1;
    }

    &.transition-status-exit-active {
      opacity: 0;
    }
  }

  /* Reduced motion variant */
  &.transition-status--reduced-motion {
    transition-duration: 0.1ms;

    /* Ensure no transform-based motion when reduced motion is active */
    &.transition-status-enter,
    &.transition-status-enter-active,
    &.transition-status-exit,
    &.transition-status-exit-active {
      transform: none !important;
    }

    &.transition-status-enter {
      opacity: 0;
    }

    &.transition-status-enter-active {
      opacity: 1;
    }

    &.transition-status-exit {
      opacity: 1;
    }

    &.transition-status-exit-active {
      opacity: 0;
    }
  }
`;
