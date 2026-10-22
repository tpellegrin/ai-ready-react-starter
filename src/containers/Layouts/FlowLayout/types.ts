import { type ReactNode } from 'react';

import type { LayoutHeaderProps } from '../common/LayoutHeader';
import type { LayoutFooterProps } from '../common/LayoutFooter';
import type { FlowLayoutHeaderProps } from './FlowLayoutHeader';
import type { FlexProps } from 'components/Flex';

export type HeaderProp =
  | LayoutHeaderProps
  | FlowLayoutHeaderProps
  | React.ReactElement;
export type FooterProp = LayoutFooterProps | React.ReactElement;

export type Props = {
  children: ReactNode;
  banner?: ReactNode | undefined;
  header?: HeaderProp | undefined;
  footer?: FooterProp | undefined;
  showHeader?: boolean | undefined;
  showFooter?: boolean | undefined;
  paddingBlock?: string | undefined;
  paddingInline?: string | undefined;
  contentInnerClassName?: string | undefined; // applies to the inner padded wrapper (LayoutTransitionContainer)
  contentFlexProps?: Omit<FlexProps, 'children'> | undefined;
  contentRef?: React.Ref<HTMLDivElement> | undefined;
  scrollLockForMs?: number | undefined;
  scrollInitiallyLocked?: boolean | undefined;
};
