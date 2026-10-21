import { Box } from 'components/Box';

import type { Props } from './types';

export const CardBase = ({ ref, children, className, elevation }: Props) => (
  <Box
    ref={ref}
    className={className}
    elevation={elevation}
    borderRadius="md"
    borderColor="default"
    backgroundColor="muted"
    color="primary"
    px="md"
    py="md"
    pxDesktop="lg"
    pyDesktop="lg"
  >
    {children}
  </Box>
);

CardBase.displayName = 'CardBase';
