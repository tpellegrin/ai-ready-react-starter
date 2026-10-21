import { useTheme } from 'styled-components';

import { _SpinnerRoot } from './styles';

type Props = { size?: 'sm' | 'md' | undefined };

/**
 * Decorative activity indicator (hidden from assistive technology). Pair it
 * with text or an accessible status: use LoadingState for regions and
 * Button's `isPending` for actions. Static under reduced motion.
 */
export const Spinner = ({ size = 'sm' }: Props) => {
  const theme = useTheme();
  return (
    <_SpinnerRoot
      aria-hidden="true"
      $size={size === 'sm' ? theme.spacers.md : theme.spacers.xl}
    />
  );
};
