import React from 'react';

import { _LayoutFooterRoot } from './styles';
import { type Props } from './types';

export const LayoutFooter: React.FC<Props> = ({ children }) => {
  return <_LayoutFooterRoot>{children}</_LayoutFooterRoot>;
};

export type { Props as LayoutFooterProps } from './types';
