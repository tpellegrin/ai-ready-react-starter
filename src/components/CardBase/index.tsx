import { forwardRef, useMemo } from 'react';

import { Box } from 'components/Box';

import { Props, SizeProps, VariantProps } from './types';

export const CardBase = forwardRef<HTMLDivElement, Props>(
  ({ children, className, elevation, size = 'md', variant = 'base' }, ref) => {
    const sizeProps: SizeProps = useMemo(() => {
      switch (size) {
        case 'md':
        default:
          return {
            borderRadius: 'md',
            px: 'md',
            py: 'md',
            pxDesktop: 'lg',
            pyDesktop: 'lg',
          };
      }
    }, [size]);

    const variantProps: VariantProps = useMemo(() => {
      switch (variant) {
        case 'base':
        default:
          return {
            borderColor: 'default',
            backgroundColor: 'muted',
            color: 'primary',
          };
      }
    }, [variant]);

    return (
      <Box
        ref={ref}
        {...sizeProps}
        {...variantProps}
        className={className}
        elevation={elevation}
      >
        {children}
      </Box>
    );
  },
);
