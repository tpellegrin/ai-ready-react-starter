import { isValidElement } from 'react';
import type { ReactElement } from 'react';

import { LayoutHeader, type LayoutHeaderProps } from './LayoutHeader';
import { LayoutFooter, type LayoutFooterProps } from './LayoutFooter';

type HeaderInput = ReactElement | LayoutHeaderProps;
type FooterInput = ReactElement | LayoutFooterProps;

export const resolveHeader = (
  header: HeaderInput | undefined,
  show: boolean,
): ReactElement | undefined => {
  if (!show || !header) return undefined;
  if (isValidElement(header)) return header;
  return <LayoutHeader {...header} />;
};

export const resolveFooter = (
  footer: FooterInput | undefined,
  show: boolean,
): ReactElement | undefined => {
  if (!show || !footer) return undefined;
  if (isValidElement(footer)) return footer;
  return <LayoutFooter {...footer} />;
};
