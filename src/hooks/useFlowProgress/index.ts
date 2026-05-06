import { useLocation } from 'react-router-dom';

import { getProgress } from 'globals/context/ProgressBar';
import { getStepIndex, isFlowId, parseFlowFromPath } from 'flows/fromPaths';

import { Props } from './types';

export const useFlowProgressFromPaths = (): Props => {
  const { pathname } = useLocation();
  const { flowId, step } = parseFlowFromPath(pathname);

  if (!flowId) return { percentage: 0, index: 0, position: 0, total: 0 };

  if (!isFlowId(flowId)) {
    return { percentage: 0, index: 0, position: 0, total: 0, flowId, step };
  }

  const { steps, idx } = getStepIndex(flowId, step ?? '');
  const total = steps.length;

  const position = idx >= 0 ? idx + 1 : Math.min(1, total);
  const percentage = total > 0 ? getProgress({ screens: total, position }) : 0;

  return {
    percentage,
    index: Math.max(0, idx),
    position,
    total,
    flowId,
    step,
  };
};
