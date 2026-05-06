import { TRANSITIONS } from 'utils/transitions/config';

export const DURATION_MS = TRANSITIONS.duration.default;
export const TRANSITION_CLASS = TRANSITIONS.class.transition;
export const BODY_CLASS = TRANSITIONS.class.body;

export enum TransitionType {
  ltr = 'ltr',
  rtl = 'rtl',
  fade = 'fade',
}
