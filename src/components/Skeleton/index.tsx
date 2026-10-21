import type { Theme } from 'styles/themes/types';
import { useTheme } from 'styled-components';

import { _SkeletonRoot } from './styles';

type Props = {
  /** Height as a spacer token. */
  height?: keyof Theme['spacers'] | undefined;
  /** CSS width (e.g. "100%", "60%"). */
  width?: string | undefined;
};

/**
 * Decorative placeholder that reserves layout while content loads. Hidden
 * from assistive technology: announce loading with LoadingState instead.
 */
export const Skeleton = ({ height = 'lg', width = '100%' }: Props) => {
  const theme = useTheme();
  return (
    <_SkeletonRoot
      aria-hidden="true"
      $height={theme.spacers[height]}
      $width={width}
    />
  );
};
