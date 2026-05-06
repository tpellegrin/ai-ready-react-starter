import { isValidElement } from 'react';
import type { ReactElement } from 'react';

import { LayoutHeader } from './LayoutHeader';
import { LayoutFooter } from './LayoutFooter';
import type { Props as LayoutHeaderProps } from './LayoutHeader/types';
import type { Props as LayoutFooterProps } from './LayoutFooter/types';

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
