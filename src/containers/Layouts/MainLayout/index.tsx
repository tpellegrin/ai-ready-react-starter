import React, { useMemo } from 'react';

import { BaseLayout } from '../common/BaseLayout';
import { _LayoutTransitionContainerRoot } from '../common/LayoutTransitionContainer/styles';
import { resolveHeader, resolveFooter } from '../common/helpers';

import { Props } from './types';

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
      <_LayoutTransitionContainerRoot className={contentInnerClassName}>
        {children}
      </_LayoutTransitionContainerRoot>
    </BaseLayout>
  );
};
