import type { ReactNode } from 'react';

import { Text } from 'components/Text';

import { use__Name__ } from './logic';
import { ___Name__Root } from './styles';

export type __Name__Props = {
  label: string;
  children?: ReactNode;
};

/**
 * __Name__ (__scope__): rendering only; state, derived values and handlers
 * live in logic.ts. See docs/ui/foundation.md before growing it.
 */
export const __Name__ = ({ label, children }: __Name__Props) => {
  const { title } = use__Name__(label);
  return (
    <___Name__Root>
      <Text variant="bodyMdBold">{title}</Text>
      {children}
    </___Name__Root>
  );
};
