import type React from 'react';

import type { BaseLayoutProps } from '../common/BaseLayout';
import type { LayoutHeaderProps } from '../common/LayoutHeader';
import type { LayoutFooterProps } from '../common/LayoutFooter';

export type HeaderProp = LayoutHeaderProps | React.ReactElement;
export type FooterProp = LayoutFooterProps | React.ReactElement;

export interface Props extends Omit<BaseLayoutProps, 'header' | 'footer'> {
  header?: HeaderProp | undefined;
  footer?: FooterProp | undefined;
  showHeader?: boolean | undefined;
  showFooter?: boolean | undefined;
  /** Class name applied to the inner padded content wrapper (LayoutTransitionContainer). */
  contentInnerClassName?: string | undefined;
}
