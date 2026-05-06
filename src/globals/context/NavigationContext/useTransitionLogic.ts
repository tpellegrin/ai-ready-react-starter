import { useMemo } from 'react';
import { TransitionType } from 'containers/Layouts/common/LayoutTransitionContainer/types';

/**
 * Intent-first transition logic with global Fade baseline.
 * - If a forced (intent) type is provided, use it.
 * - Otherwise, use Fade globally.
 *
 * Flow inference is intentionally removed to avoid conflicts: goNext/goBack
 * are the only sources of directional transitions.
 */
export const useTransitionLogic = (
  forcedTransitionType?: TransitionType,
): TransitionType | null => {
  return useMemo<TransitionType | null>(() => {
    return forcedTransitionType ?? TransitionType.fade;
  }, [forcedTransitionType]);
};
