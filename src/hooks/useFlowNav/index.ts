import { useLocation, useNavigate } from 'react-router-dom';

import { useNavigation } from 'globals/context/NavigationContext';
import { TransitionType } from 'containers/Layouts/common/LayoutTransitionContainer/types';
import { getAccessibleDuration, TRANSITIONS } from 'utils/transitions/config';
import {
  getNextStepPath,
  getNextApplicableStepPath,
  parseFlowFromPath,
  CanEnterFn,
} from 'flows/fromPaths';

/**
 * useFlowNav
 *
 * Helpers to navigate within flows while expressing the user's intent
 * for the next transition direction. Intent takes precedence over the
 * global baseline Fade.
 */
export const useFlowNav = <T = unknown>(
  state?: T,
  guards?: Partial<Record<string, CanEnterFn<T>>>,
) => {
  const duration = getAccessibleDuration(TRANSITIONS.duration.default);
  const { setNextTransitionIntent, tryAcquireNavLock, clearNavigationBlock } =
    useNavigation();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  /**
   * Advance to the next step in the flow.
   * If `to` is not provided, compute the next step from paths.ts order based on the current URL.
   * A new screen slides in from the right; content moves left.
   */
  const goNext = (to?: string) => {
    let target = to;
    if (!target) {
      const { flowId, step } = parseFlowFromPath(pathname);
      if (flowId && step) {
        // Prefer skipping inapplicable steps via centralized guards; fallback to static next
        target =
          getNextApplicableStepPath(flowId, step, state, guards) ??
          getNextStepPath(flowId, step) ??
          undefined;
      }
    }

    if (!target) {
      // No next step (end of flow) → noop; caller can handle finish explicitly
      return false;
    }

    const lockMs = duration + 120;
    if (!tryAcquireNavLock(lockMs)) return false;

    try {
      setNextTransitionIntent(TransitionType.ltr);
      return navigate(target);
    } catch (error) {
      clearNavigationBlock();
      setNextTransitionIntent(null);
      throw error;
    }
  };

  /**
   * Go back within the flow. If `to` is a number, it is passed directly
   * to react-router's Navigate (e.g., -1 to go back in history).
   * A new screen slides in from the left; content moves right.
   */
  const goBack = (to: string | number = -1) => {
    const lockMs = duration + 120;
    if (!tryAcquireNavLock(lockMs)) return false;

    try {
      setNextTransitionIntent(TransitionType.rtl);
      if (typeof to === 'number') {
        return navigate(to);
      }
      return navigate(to);
    } catch (error) {
      clearNavigationBlock();
      setNextTransitionIntent(null);
      throw error;
    }
  };

  return { goNext, goBack };
};
