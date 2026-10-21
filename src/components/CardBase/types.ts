import type { ReactNode, Ref } from 'react';

import type { Props as BoxProps } from 'components/Box/types';

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
