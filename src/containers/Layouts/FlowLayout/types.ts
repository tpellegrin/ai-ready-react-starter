import { ReactNode } from 'react';
import { SpaceColorKeys } from 'utils/colors';
import { Theme } from 'styles/themes/types';

import { Props as LayoutHeaderProps } from '../common/LayoutHeader/types';
import { Props as LayoutFooterProps } from '../common/LayoutFooter/types';
import type { FlowLayoutHeaderProps } from './FlowLayoutHeader';
import type { Props as FlexProps } from 'components/Flex/types';

export type HeaderProp =
  | LayoutHeaderProps
  | FlowLayoutHeaderProps
  | React.ReactElement;
export type FooterProp = LayoutFooterProps | React.ReactElement;

export type Props = {
  children: ReactNode;
  banner?: ReactNode;
  header?: HeaderProp;
  footer?: FooterProp;
  showHeader?: boolean;
  showFooter?: boolean;
  backgroundColor?: SpaceColorKeys<'surface'>;
  gradient?: keyof Theme['gradients'];
  maxWidth?: number;
  paddingBlock?: string;
  paddingInline?: string;
  contentInnerClassName?: string; // applies to the inner padded wrapper (LayoutTransitionContainer)
  fixedFooter?: boolean;
  stickyHeader?: boolean;
  contentFlexProps?: Omit<FlexProps, 'children'>;
  contentRef?: React.Ref<HTMLDivElement>;
  scrollLockForMs?: number;
  scrollInitiallyLocked?: boolean;
};
