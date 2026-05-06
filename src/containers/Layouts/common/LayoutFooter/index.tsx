import React from 'react';

import { _LayoutFooterRoot } from './styles';
import { Props } from './types';

export const LayoutFooter: React.FC<Props> = ({ children }) => {
  return <_LayoutFooterRoot>{children}</_LayoutFooterRoot>;
};
