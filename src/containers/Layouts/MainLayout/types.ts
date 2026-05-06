import React from 'react';

import { Props as BaseLayoutProps } from '../common/BaseLayout';
import { Props as LayoutHeaderProps } from '../common/LayoutHeader/types';
import { Props as LayoutFooterProps } from '../common/LayoutFooter/types';

export type HeaderProp = LayoutHeaderProps | React.ReactElement;
export type FooterProp = LayoutFooterProps | React.ReactElement;

export interface Props extends Omit<BaseLayoutProps, 'header' | 'footer'> {
  header?: HeaderProp;
  footer?: FooterProp;
  showHeader?: boolean;
  showFooter?: boolean;
  /** Class name applied to the inner padded content wrapper (LayoutTransitionContainer). */
  contentInnerClassName?: string;
}
