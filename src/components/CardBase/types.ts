import type { ReactNode, Ref } from 'react';

import type { BoxProps } from 'components/Box';

/**
 * A raised card surface (Box with card radius, padding and muted background).
 * For other surface variations compose Box directly.
 */
export type Props = {
  ref?: Ref<HTMLDivElement> | undefined;
  children?: ReactNode;
  className?: string | undefined;
  elevation?: BoxProps['elevation'];
};
