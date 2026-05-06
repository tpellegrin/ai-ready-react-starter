import React, { useContext, useEffect, useMemo } from 'react';

import { GlobalProgressBarContext } from 'globals/context/ProgressBar';
import { Progress } from 'components/Progress';
import { useFlowProgressFromPaths } from 'hooks/useFlowProgress';

import type { Props } from './types';

export const LayoutProgress: React.FC<Props> = ({ progress }) => {
  const auto = useFlowProgressFromPaths();
  const value = useMemo(() => {
    return typeof progress === 'number' ? progress : auto.percentage;
  }, [auto.percentage, progress]);

  const { updateCurrentProgress } = useContext(GlobalProgressBarContext);

  useEffect(() => {
    if (updateCurrentProgress) {
      updateCurrentProgress(value);
    }
  }, [updateCurrentProgress, value]);

  return (
    <GlobalProgressBarContext.Consumer>
      {({ currentProgress }) => (
        <Progress percentage={currentProgress} variant="rectangular" />
      )}
    </GlobalProgressBarContext.Consumer>
  );
};
