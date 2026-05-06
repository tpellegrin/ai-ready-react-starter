import { css } from 'styled-components';
import { TRANSITIONS, getAccessibleDuration } from './config';
import { TransitionType } from 'containers/Layouts/common/LayoutTransitionContainer/types';

/**
 * Generate CSS for transitions based on selector and CSS states
 * This is a simplified version that avoids complex template literal interpolation
 */
export const generateTransition = (
  transitionSelector: string,
  enterCss: ReturnType<typeof css>,
  idleCss: ReturnType<typeof css>,
  exitCss: ReturnType<typeof css>,
  transition = 'all',
  durationMs = TRANSITIONS.duration.default,
  easing = TRANSITIONS.easing.default,
  delayEnterMs = TRANSITIONS.delay.none,
  delayExitMs = delayEnterMs,
) => {
  // Apply accessibility adjustments
  const accessibleDuration = getAccessibleDuration(durationMs);

  return css`
    ${transitionSelector}-enter & {
      ${enterCss}
    }

    ${transitionSelector}-enter-active & {
      ${idleCss}
    }

    ${transitionSelector}-enter-active & {
      transition: ${transition} ${accessibleDuration}ms ${easing}
        ${delayEnterMs}ms;
    }

    ${transitionSelector}-enter-done & {
      ${idleCss}
    }

    ${transitionSelector}-exit & {
      ${idleCss}
    }

    ${transitionSelector}-exit-active & {
      ${exitCss}
    }

    ${transitionSelector}-exit-active & {
      transition: ${transition} ${accessibleDuration}ms ${easing}
        ${delayExitMs}ms;
    }
  `;
};

/**
 * Transition configuration for different transition types
 */
const transitionConfigs = {
  [TransitionType.ltr]: {
    enter: css`
      transform: translateX(100%);
    `,
    idle: css`
      transform: translateX(0%);
    `,
    exit: css`
      transform: translateX(-100%);
    `,
    property: 'transform',
  },
  [TransitionType.rtl]: {
    enter: css`
      transform: translateX(-100%);
    `,
    idle: css`
      transform: translateX(0%);
    `,
    exit: css`
      transform: translateX(100%);
    `,
    property: 'transform',
  },
  [TransitionType.fade]: {
    enter: css`
      opacity: 0;
    `,
    idle: css`
      opacity: 1;
    `,
    exit: css`
      opacity: 0;
    `,
    property: 'opacity',
  },
};

/**
 * Create a transition based on transition type and selector
 * This is a more reusable version of generateTransition
 */
export const createTransition = (
  type: TransitionType,
  selector: string,
  durationMs = TRANSITIONS.duration.default,
  easing = TRANSITIONS.easing.default,
  delayMs = TRANSITIONS.delay.none,
) => {
  const config = transitionConfigs[type];

  return generateTransition(
    selector,
    config.enter,
    config.idle,
    config.exit,
    config.property,
    durationMs,
    easing,
    delayMs,
    delayMs,
  );
};
