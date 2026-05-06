import React from 'react';

export type ButtonProps = React.ComponentProps<'button'> & {
  children?: React.ReactNode;
};

export type Props = {
  prevButton?: ButtonProps;
  closeButton?: ButtonProps;
  title?: React.ReactNode;
  progress?: number | 'auto';
};
