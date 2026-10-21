import type React from 'react';

export type ButtonProps = React.ComponentProps<'button'> & {
  children?: React.ReactNode | undefined;
};

export type Props = {
  prevButton?: ButtonProps | undefined;
  closeButton?: ButtonProps | undefined;
  title?: React.ReactNode | undefined;
  progress?: number | 'auto' | undefined;
};
