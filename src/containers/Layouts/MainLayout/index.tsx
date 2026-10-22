import React, { useMemo } from 'react';

import { BaseLayout } from '../common/BaseLayout';
import { LayoutTransitionContainer } from '../common/LayoutTransitionContainer';
import { resolveHeader, resolveFooter } from '../common/helpers';

import { type Props } from './types';

export const MainLayout: React.FC<Props> = ({
  children,
  showHeader = true,
  showFooter = true,
  header,
  footer,
  backgroundColor,
  gradient,
  stickyHeader,
  fixedFooter = true,
  contentClassName,
  contentInnerClassName,
}) => {
  const resolvedHeader = useMemo(
    () => resolveHeader(header, showHeader),
    [header, showHeader],
  );

  const resolvedFooter = useMemo(
    () => resolveFooter(footer, showFooter),
    [footer, showFooter],
  );

  return (
    <BaseLayout
      backgroundColor={backgroundColor}
      gradient={gradient}
      header={resolvedHeader}
      footer={resolvedFooter}
      stickyHeader={stickyHeader ?? true}
      fixedFooter={fixedFooter}
      contentClassName={contentClassName}
    >
      <LayoutTransitionContainer className={contentInnerClassName}>
        {children}
      </LayoutTransitionContainer>
    </BaseLayout>
  );
};

export type { FooterProp, HeaderProp, Props as MainLayoutProps } from './types';
