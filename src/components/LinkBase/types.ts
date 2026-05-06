import type { AnchorHTMLAttributes, MouseEventHandler, ReactNode } from 'react';

type CommonProps = {
  blurDelay?: number;
  blurOnClick?: boolean;
  disabled?: boolean;
  stopPropagation?: boolean;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
  isFullWidth?: boolean;
  children?: ReactNode;
};

export type Props = CommonProps &
  Omit<
    AnchorHTMLAttributes<HTMLAnchorElement>,
    'onClick' | 'children' | 'href'
  > & {
    href: string;
  };
