import React from 'react';

import { _ProgressRoot, _ProgressValue } from './styles';
import type { Props } from './types';

export const Progress: React.FC<Props> = ({
  percentage,
  variant = 'rounded',
}) => {
  const clampedPercentage = Math.max(0, Math.min(percentage, 100));

  return (
    <_ProgressRoot
      role="progressbar"
      aria-valuenow={clampedPercentage}
      aria-valuemin={0}
      aria-valuemax={100}
      $variant={variant}
    >
      <_ProgressValue $value={clampedPercentage} />
    </_ProgressRoot>
  );
};
